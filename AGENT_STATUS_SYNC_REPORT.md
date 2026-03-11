# Agent 状态同步实现报告

**日期**: 2026-03-11  
**分支**: dev  
**提交**: 3af24b3

---

## 改动的文件

### 数据库迁移
- `db/migrations/20260311_agent_runtime_status.sql` - 增强版 migration
  - 新增字段: `status_source`, `current_task`, `work_started_at`, `last_idle_at`, `presence`, `description`
  - 新增索引: `idx_agents_presence`, `idx_agents_state`, `idx_agents_agent_key` (unique)
  - 设置默认值: `status_source='runtime'`, `presence='unknown'`

### API 路由
- `src/app/api/agents/route.ts` - 重写 GET 逻辑
  - 实现完整 roster + runtime overlay 合并
  - 推导 `presence` (online/offline/unknown)
  - 推导 `work_state` (running/idle/offline)
  - 计算 `freshness_level` (fresh/recent/stale/unknown)
  - 显示名覆盖规则 (feishu_main → "道 Q 鲍特")
  - 排除 boss (非 agent)

- `src/app/api/agents/status/route.ts` - 增强版状态写入
  - POST: 单条状态上报
  - PUT: 批量状态更新
  - 自动推导 presence
  - 拒绝 boss 上报
  - 更新时间戳字段 (work_started_at, last_idle_at)

### 工具库
- `src/lib/agent-status.ts` - 状态更新工具函数
  - `updateAgentStatus()` - 单条更新
  - `withAgentStatus()` - 包装函数 (自动标记 running→idle)
  - `updateAgentStatuses()` - 批量更新
  - `markAgentOffline()` - 心跳超时标记
  - `getAgentStatus()` - 查询当前状态

### 类型定义
- `src/lib/types.ts` - 扩展 Agent 接口
  ```typescript
  interface Agent {
    // 基础字段
    id, agent_key, display_name, description, state, last_seen_at
    // Runtime 字段
    status_source?, current_task?, work_started_at?, last_idle_at?, presence?
    // 派生字段
    work_state?, freshness_level?, freshness_label?
  }
  ```

### 前端组件
- `src/components/dashboard/TeamOverview.tsx` - 状态显示增强
  - 区分 online/idle/offline 三种状态
  - 使用 presence 字段辅助判断
  - 排序逻辑：在线优先 → 空闲 → 离线

- `src/features/dashboard/lib/team-insights.ts` - 洞察分析增强
  - 利用 API 返回的 freshness 字段
  - 更准确的状态摘要生成
  - 改进 onlineCount 统计逻辑

### 辅助脚本
- `run-agent-migration.js` - 数据库迁移执行脚本
- `test-agent-status.js` - API 测试脚本

---

## 当前状态同步能力

### ✅ 已实现

| 状态场景 | 实现方式 | 显示效果 |
|---------|---------|---------|
| **Roster 中存在但未上报** | KNOWN_TEAM_ROSTER 硬编码名单 + LEFT JOIN 合并 | 显示在 roster 中，state=offline, presence=unknown |
| **在线但空闲** | POST state='idle' | state=idle, presence=online, 琥珀色标签 |
| **在线且忙** | POST state='running' | state=running, presence=online, 绿色标签 |
| **离线/状态过期** | POST state='offline' 或 last_seen_at 超时 10 分钟 | presence=offline, 灰色标签 |
| **Freshness 新鲜度** | 基于 last_seen_at 自动计算 | 1 小时内=fresh, 24 小时内=recent, 超过=stale |
| **显示名覆盖** | AGENT_OVERRIDES 配置 | feishu_main → "道 Q 鲍特" |
| **Boss 排除** | API 层过滤 + 状态上报拒绝 | boss 不出现在 agent roster |

### 状态推导逻辑

```
presence = f(last_seen_at, timeout=10min)
  - 无 last_seen_at → unknown
  - last_seen_at > 10min → offline
  - 否则 → online

work_state = f(state, presence, last_seen_at)
  - presence=offline → offline
  - last_seen_at 超时但 state=running → idle (自动修正)
  - 否则 → normalized(state)

freshness = f(last_seen_at)
  - 无 → unknown
  - <1h → fresh
  - <24h → recent
  - 否则 → stale
```

---

## 还需要 OpenClaw/Runtime 侧接入

### 🔌 必需接入点

1. **定期状态上报** (心跳)
   ```bash
   POST /api/agents/status
   {
     "agent_key": "main",
     "state": "running",  // running | idle | offline
     "current_task": "处理用户请求",  // 可选
     "display_name": "鲍特",  // 可选，首次上报时使用
     "description": "主助理"  // 可选
   }
   ```

2. **任务开始/结束钩子**
   - 任务开始时：`state='running', current_task='...'`
   - 任务结束时：`state='idle'`

3. **心跳超时处理** (可选在 OpenClaw 侧实现)
   - 如果 agent 超过 10 分钟未上报，自动调用 API 标记为 offline

### 📋 推荐集成模式

```typescript
// OpenClaw 侧伪代码
async function runAgentTask(agentKey: string, task: () => Promise<void>) {
  // 任务开始
  await fetch('/api/agents/status', {
    method: 'POST',
    body: JSON.stringify({
      agent_key: agentKey,
      state: 'running',
      current_task: task.name,
    }),
  });
  
  try {
    await task();
  } finally {
    // 任务结束
    await fetch('/api/agents/status', {
      method: 'POST',
      body: JSON.stringify({
        agent_key: agentKey,
        state: 'idle',
      }),
    });
  }
}

// 定期心跳 (每 5 分钟)
setInterval(() => {
  if (currentTask) {
    // 保持 running 状态
    updateStatus('running');
  } else {
    // 保持 idle 状态
    updateStatus('idle');
  }
}, 5 * 60 * 1000);
```

---

## 测试验证

### Build 状态
```
✓ Compiled successfully
✓ Generating static pages (16/16)
✓ Build completed with exit code 0
```

### 数据库迁移
```
✅ agents.status_source
✅ agents.current_task
✅ agents.work_started_at
✅ agents.last_idle_at
✅ agents.presence
✅ agents.description
✅ All indexes created
```

### API 端点
- `GET /api/agents` - ✅ 返回完整 roster + runtime 合并数据
- `POST /api/agents/status` - ✅ 接受状态上报
- `PUT /api/agents/status` - ✅ 支持批量更新

---

## 后续优化建议

1. **WebSocket 实时推送** - 当前使用 Supabase Realtime，可考虑增加 WebSocket 支持
2. **状态历史审计** - 添加 `agent_status_history` 表记录状态变更
3. **健康度指标** - 基于在线时长、任务完成率计算 agent 健康分
4. **自动恢复** - 检测到 agent 异常离线时自动告警

---

**交付完成** ✅  
代码已 push 到 `origin/dev` 分支
