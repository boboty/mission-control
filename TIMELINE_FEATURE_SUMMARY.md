# 任务时间线/评论功能实现总结

## 任务 #93:【P2】任务评论/时间线功能

### ✅ 已完成的工作

#### 1. 数据库迁移

**文件**: `db/migrations/20260308_task_events_enhancement.sql`

增强了 `task_events` 表结构，支持完整的事件追踪：

```sql
CREATE TABLE task_events (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL DEFAULT 'status_change',
  old_value VARCHAR(255),
  new_value VARCHAR(255) NOT NULL,
  actor VARCHAR(100),
  comment TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**支持的事件类型**:
- `created` - 任务创建
- `status_change` - 状态变更
- `owner_change` - 负责人变更
- `priority_change` - 优先级变更
- `due_date_change` - 截止日期变更
- `next_action_change` - 下一步行动更新
- `comment` - 评论

**索引**:
- `idx_task_events_task_id` - 按任务 ID 查询
- `idx_task_events_created_at` - 按时间排序
- `idx_task_events_event_type` - 按事件类型过滤

#### 2. API 更新

**文件**: `src/app/api/tasks/route.ts`

**PATCH 端点增强**:
- 自动记录所有字段变更事件
- 支持添加评论 (`comment` 字段)
- 每个变更都记录 `old_value`、`new_value`、`actor` 和 `meta`

**GET 端点新增**:
- 支持 `?taskId=123&timeline=true` 查询参数
- 返回任务的所有历史事件（按时间倒序）

#### 3. 前端组件更新

**文件**: `src/components/DetailModal.tsx`

**新增功能**:
- ✅ 时间线标签页（任务类型始终可见）
- ✅ 时间线事件展示（状态变更、负责人变更、优先级变更等）
- ✅ 添加评论功能（输入框、发布按钮）
- ✅ 事件类型图标和描述映射
- ✅ 操作者信息显示
- ✅ 评论高亮显示

**UI 改进**:
- 时间线按时间倒序排列
- 评论使用不同的视觉样式
- 添加评论按钮仅在时间线标签页显示
- 支持空状态提示

#### 4. 页面集成

**文件**: `src/app/page.tsx`

**更新内容**:
- `taskToDetail` 函数支持传入时间线数据
- `openDetail` 函数异步加载任务时间线
- 事件类型显示文本映射函数

### 📋 待执行步骤

#### 1. 运行数据库迁移

**方式 A: Supabase SQL Editor**
1. 访问 https://lzhgwgwqldflbozvhuot.supabase.co
2. 进入 SQL Editor
3. 复制并执行 `db/migrations/20260308_task_events_enhancement.sql` 内容

**方式 B: 使用 Node.js 脚本**
```bash
cd ~/github/mission-control
node scripts/check-db.js
```

#### 2. 测试功能

1. 启动开发服务器：`npm run dev`
2. 打开任意任务详情
3. 点击"时间线"标签页
4. 查看历史事件
5. 点击"添加评论"测试评论功能
6. 修改任务状态/负责人/优先级，验证事件自动记录

### 🎯 功能特性

#### 时间线显示
- ✅ 创建时间
- ✅ 状态变更（谁在何时从 X 改为 Y）
- ✅ 负责人变更
- ✅ 优先级变更
- ✅ 截止日期变更
- ✅ 下一步行动更新
- ✅ 评论（支持添加）
- ✅ 按时间倒序排列

#### 自动记录
- ✅ 每次任务更新时自动记录事件
- ✅ 记录变更前后值
- ✅ 记录操作者
- ✅ 支持元数据

#### UI 一致性
- ✅ 与现有 UI 风格一致
- ✅ 使用现有图标系统
- ✅ 响应式设计
- ✅ 暗色模式支持

### 📁 修改的文件清单

1. `db/migrations/20260308_task_events_enhancement.sql` - 新增
2. `db/migrations/README.md` - 新增
3. `src/app/api/tasks/route.ts` - 修改
4. `src/components/DetailModal.tsx` - 修改
5. `src/app/page.tsx` - 修改
6. `scripts/check-db.js` - 新增
7. `scripts/migrate-task-events.js` - 新增

### 🔧 技术实现细节

#### 事件记录逻辑
```typescript
// 在 PATCH 请求中自动记录
if (status !== undefined && status !== oldTask.status) {
  await recordTaskEvent(pool, taskId, 'status_change', oldTask.status, status, actor, null, meta);
}
```

#### 时间线加载
```typescript
// 在 DetailModal 中加载
const loadTimeline = async (taskId: number) => {
  const res = await fetch(`/api/tasks?taskId=${taskId}&timeline=true`);
  const result = await res.json();
  // 转换事件格式并显示
};
```

#### 评论添加
```typescript
// 通过 PATCH 请求添加评论
await fetch('/api/tasks', {
  method: 'PATCH',
  body: JSON.stringify({
    taskId: 123,
    comment: '这是一条评论',
    actor: 'user'
  })
});
```

### ✨ 用户体验

1. **查看时间线**: 点击任务卡片 → 打开详情 → 点击"时间线"标签页
2. **添加评论**: 在时间线标签页点击"添加评论" → 输入内容 → 发布
3. **自动记录**: 修改任务任何字段都会自动记录到时间线

---

**状态**: ✅ 代码完成，待执行数据库迁移
**优先级**: P2
**预计测试时间**: 10-15 分钟
