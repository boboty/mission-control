# Mission Control UI 改造方案（草案）

> 目标：在不推翻现有 Next.js/Supabase/PG 架构的前提下，重构 UI 结构与数据流，让“任务巡检 + 运营监控”更清晰、更可扩展。

## 0. 现状速览（基于代码）
- **技术栈**：Next.js（App Router）+ React 19 + TypeScript + Tailwind v4 + DnD-Kit
- **数据访问**：API Route 内用 `pg` 直连 Supabase Postgres（`DATABASE_URL`）
- **模块**：任务看板、流程管线、日历、记忆主题、团队概览、运行健康、决策中心、告警
- **脚本**：
  - `scripts/sync-board-to-supabase.mjs`：从 `board.md` 同步 tasks
  - `scripts/heartbeat_check_tasks.mjs`：心跳巡检并输出告警

## 1. 功能模块划分（目标 UI 信息架构）
建议将“仪表盘 + 模块页面”拆成**统一导航 + 模块级页面**，并将“数据质量/告警/决策”独立为固定模块，避免被埋在卡片内。

### 1.1 顶层信息架构
- **Overview**（总览）
  - 关键指标（任务总数、进行中、阻塞、待决）
  - 告警聚合（阻塞>2h、数据落后、失败心跳）
  - 系统健康状态（cron 状态、最近同步）
- **Tasks**（任务工作台）
  - 视图：列表 / 分组 / 看板
  - 过滤：状态、负责人、优先级、时间范围
  - 快速操作：拖拽改状态、标记 blocker、填写 next_action
- **Decisions**（决策中心）
  - 聚焦 blocker / 高优任务
  - 交互：一键“解决/完成”或“升级”为阻塞
- **Pipelines**（流程管线）
  - 进度列表 + 详情
- **Calendar**（日程）
  - 时间维度展示 + 任务到期联动
- **Memory**（记忆/主题）
  - 结构化主题列表 + Markdown 详情
- **Agents**（智能体/成员）
  - 状态与活跃度
- **Health**（运行健康）
  - 最新健康快照 + 历史趋势

### 1.2 页面布局建议
- 左侧导航：固定模块树（可折叠）
- 顶部栏：模块标题 + 数据源/更新时间 + 快捷刷新
- 主区域：模块主视图
- 右侧可选：**详情抽屉**（Task/Decision/Health/Agent 等统一详情样式）

## 2. 数据流设计
当前逻辑为“客户端 useEffect -> `/api/*` -> Supabase”。建议分层：

```
UI组件 -> hooks (SWR/React Query) -> API Route -> db/query -> Supabase
```

### 2.1 数据层规范化
新增 `src/lib/db.ts` 统一 PG 连接配置（pool + retry）；新增 `src/lib/queries/*` 封装 SQL。

### 2.2 API 层统一响应格式
所有 `/api/*` 返回统一 envelope：
```ts
{ data, pagination?, meta: { last_sync_at, data_updated_at, source } }
```
便于 UI 统一显示“数据源/更新时间/落后情况”。

### 2.3 客户端数据策略
- 读：`useSWR` 或轻量封装 `useFetch`（避免全页 useEffect）
- 写：PATCH/POST 走 API Route（状态变更、标记阻塞等）
- 刷新策略：
  - 页面加载 -> 拉取
  - 每 60s 轻量刷新 metrics + health（可配置）

## 3. 技术选型建议（与现有兼容）
- **继续使用 Tailwind v4 + DnD-Kit**（已有组件）
- 建议引入：
  - `SWR`（轻量数据缓存）或 `@tanstack/react-query`（若需要更复杂缓存）
  - `zod`（API 入参验证）
  - `clsx`（class 合并）
- UI 组件库：
  - 保持现有自研 Card/Metric 等
  - 若需要更标准，可引入 shadcn/ui（但会增加样式维护成本）

## 4. Supabase tasks 表结构（待确认）
根据现有 API/脚本推断：

```
Tasks(
  id,
  title,
  status,        -- todo/in_progress/checklist/blocked/done
  priority,      -- high/medium/low (或 P0/P1 映射)
  owner,
  blocker,       -- boolean
  next_action,
  due_at,
  depends_on?,   -- heartbeat_check_tasks 使用
  source,
  updated_at,
  created_at?
)
```
> **需要补充确认**：真实 Supabase 表结构、索引、约束、task_events 表结构。

## 5. 与现有脚本的集成方式
### 5.1 sync-board-to-supabase
- 作用：从 `board.md` 生成 tasks + health_snapshots
- UI 侧建议：
  - “数据源状态”卡片中展示最后一次 `sync-board` 的时间
  - 对 `source = 'board'` 的任务标记来源徽章

### 5.2 heartbeat_check_tasks
- 输出阻塞/陈旧任务
- UI 侧建议：
  - 将 heartbeat 结果写入 health_snapshots
  - Health 模块展示“最新检测时间 + 关键告警摘要”

### 5.3 未来（Feishu Bitable）
- 统一通过 `source` 字段标识（board / bitable / manual）
- 可在 UI 增加 “来源过滤器”

## 6. 关键 UI 改造方向
### 6.1 总览页（Overview）
- **上层 KPI**：4 指标 + trend
- **Alert 区**：阻塞 > 2h、数据 stale、cron fail
- **决策中心**：阻塞/高优任务列表（带快速操作）

### 6.2 Tasks 工作台
- 三视图：列表/分组/看板
- 过滤条件统一抽出为 **FilterBar**
- 行内状态改动 + next_action 编辑

### 6.3 Detail Drawer 统一
- 任务/管线/健康/Agent 详情统一 UI 模式
- Timeline、相关对象、元数据固定区块

## 7. 渐进式实施步骤
1. **结构整理**：抽出 `hooks/`、`queries/`、`components/layout/`
2. **API 标准化**：统一响应 meta & pagination
3. **总览页升级**：Alerts + Metrics + Decision 独立模块
4. **Tasks 工作台升级**：FilterBar + inline edit
5. **Detail Drawer 抽象**：统一 detail 组件
6. **Health 模块**：趋势 + 数据新鲜度提示

---

## 需要你补充的内容
1. **Supabase tasks 表真实结构**（字段/索引/约束）
2. task_events 表结构（若已有）
3. 是否计划支持多来源任务（board + bitable + manual）

---

如确认 Supabase 表结构后，我会补充详细 ERD 与 API payload 设计。