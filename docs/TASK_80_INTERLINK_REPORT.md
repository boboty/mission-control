# Task #80: 任务/流程/事件互链跳转 - 实现报告

## 概述

实现了任务 (Tasks)、流程项目 (Pipelines)、日历事件 (Events) 之间的相互关联和跳转功能。

## 数据库变更

### 迁移文件
- `db/migrations/20260308_interlink_relationships.sql`

### 新增字段

**tasks 表:**
- `related_pipeline_id INTEGER` - 关联的流程项目 ID
- `related_event_id INTEGER` - 关联的日历事件 ID

**pipelines 表:**
- `related_task_id INTEGER` - 关联的任务 ID

**events 表:**
- `related_task_id INTEGER` - 关联的任务 ID

### 索引
为所有新增的外键字段创建了指引以优化查询性能。

## 代码变更

### 1. 类型定义 (`src/lib/types.ts`)
- `Task` 接口添加 `related_pipeline_id` 和 `related_event_id` 字段
- `Pipeline` 接口添加 `related_task_id` 字段
- `Event` 接口添加 `related_task_id` 字段

### 2. 数据转换 (`src/lib/data-utils.ts`)
- `taskToDetail()`: 将关联对象添加到 `relatedObjects` 数组
- `pipelineToDetail()`: 将关联任务添加到 `relatedObjects` 数组
- `eventToDetail()`: 将关联任务添加到 `relatedObjects` 数组

### 3. API 路由更新

**`/api/tasks/route.ts`:**
- GET: 查询包含 `related_pipeline_id` 和 `related_event_id`
- PATCH: 支持更新 `relatedPipelineId` 和 `relatedEventId`

**`/api/pipelines/route.ts`:**
- GET: 查询包含 `related_task_id`
- POST: 支持创建时设置 `related_task_id`
- PATCH: 支持更新 `related_task_id`

**`/api/events/route.ts`:**
- GET: 查询包含 `related_task_id`
- POST: 支持创建时设置 `related_task_id`
- PATCH: 新增 PATCH 端点，支持更新所有字段包括 `related_task_id`

### 4. 组件更新

**`src/components/DetailModal.tsx`:**
- 任务详情编辑模式添加"关联流程"和"关联日程"字段
- 支持输入 ID 进行关联
- 关联对象显示为可点击链接，点击可跳转到对应详情
- `RelatedObjects` 组件支持点击回调
- 保存时同步更新关联字段

## 功能特性

### 1. 任务详情中的关联字段
- 显示关联的流程项目 ID（如有）
- 显示关联的日历事件 ID（如有）
- 编辑模式下可输入 ID 进行关联或取消关联
- 点击关联 ID 可跳转到对应详情

### 2. 流程项目详情中的关联
- 显示关联的任务 ID（如有）
- 点击可跳转到任务详情

### 3. 日历事件详情中的关联
- 显示关联的任务 ID（如有）
- 点击可跳转到任务详情

### 4. 关联对象标签页
- DetailModal 中新增"关联对象"标签页
- 显示所有关联的任务、流程、事件
- 支持点击跳转到对应详情

## UI 风格
- 保持与现有 UI 风格一致
- 使用相同的颜色、间距、字体
- 关联对象以卡片形式展示，带图标和状态
- 可点击的关联 ID 使用主题色高亮

## 使用说明

### 关联任务到流程项目
1. 打开任务详情
2. 点击"编辑"按钮
3. 在"关联流程"字段输入流程 ID
4. 保存

### 关联任务到日历事件
1. 打开任务详情
2. 点击"编辑"按钮
3. 在"关联日程"字段输入事件 ID
4. 保存

### 关联流程/事件到任务
1. 打开流程项目或事件详情
2. 点击"编辑"按钮（如支持）
3. 在"关联任务"字段输入任务 ID
4. 保存

### 查看关联对象
1. 打开任意详情
2. 切换到"关联对象"标签页
3. 点击关联对象可跳转到对应详情

## 待办事项

- [ ] 运行数据库迁移应用 schema 变更
- [ ] 测试关联功能的端到端流程
- [ ] 添加关联对象的摘要信息显示（可选增强）
- [ ] 添加关联关系的可视化指示（可选增强）

## 技术细节

### 双向关联
当前实现支持双向关联：
- 任务 → 流程/事件（通过 `related_pipeline_id`, `related_event_id`）
- 流程/事件 → 任务（通过 `related_task_id`）

注意：这是单向外键关系，不是完全的双向同步。如果需要完全同步，需要在应用层维护一致性。

### 级联删除
外键配置为 `ON DELETE SET NULL`，当被关联的记录删除时，关联字段自动设为 NULL。

## 测试建议

1. 创建任务并关联到流程项目
2. 创建任务并关联到日历事件
3. 在流程项目详情中查看关联任务
4. 在事件详情中查看关联任务
5. 测试点击关联 ID 跳转功能
6. 测试编辑关联关系
7. 测试删除被关联记录时的行为

## 构建状态
✅ 构建成功，无 TypeScript 错误

---
**完成时间:** 2026-03-08
**状态:** 代码完成，待迁移数据库
