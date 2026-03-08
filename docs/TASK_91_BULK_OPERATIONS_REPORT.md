# TASK_91_BULK_OPERATIONS_REPORT.md

## 任务 #91:【P1】批量操作功能

**状态**: ✅ 已完成  
**优先级**: P1  
**创建时间**: 2026-03-08  
**完成时间**: 2026-03-08 11:00  

---

## 需求描述

支持多选任务批量修改状态、负责人、优先级

### 功能要求

1. ✅ 在任务列表/看板中添加复选框（每行/每卡片）
2. ✅ 顶部添加批量操作工具栏（选中后显示）：
   - ✅ 批量修改状态下拉
   - ✅ 批量修改负责人输入
   - ✅ 批量修改优先级下拉
   - ✅ "应用"按钮
3. ✅ 全选/取消全选功能
4. ✅ 显示已选数量（如"已选择 3 个任务"）
5. ✅ API 支持批量更新（批量接口）

### 额外要求

- ✅ 查看现有 TaskBoard/Pipeline 组件
- ✅ 批量操作时显示加载状态
- ✅ 操作成功后刷新列表
- ✅ 保持与现有 UI 风格一致

---

## 实现内容

### 1. 前端组件改进 (`/src/components/dashboard/TaskBoard.tsx`)

#### 新增状态管理
```typescript
// Bulk operation state
const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(new Set());
const [bulkMode, setBulkMode] = useState(false);
const [bulkLoading, setBulkLoading] = useState(false);
const [bulkStatus, setBulkStatus] = useState('');
const [bulkPriority, setBulkPriority] = useState('');
const [bulkOwner, setBulkOwner] = useState('');
```

#### 新增批量操作工具栏
- 显示已选任务数量
- 全选/取消全选切换
- 状态下拉选择（待办/进行中/已阻塞/已完成）
- 优先级下拉选择（高/中/低）
- 负责人文本输入
- 应用按钮（带加载状态指示）
- 关闭按钮

#### 组件增强
- `SortableTaskItem`: 添加复选框和选中状态高亮
- `TaskItem`: 添加复选框和选中状态高亮
- 支持单选/多选
- 选中后自动显示批量操作工具栏

#### 批量操作处理函数
```typescript
// 切换单个任务选中状态
const toggleTaskSelection = (taskId: number) => { ... }

// 全选/取消全选
const toggleSelectAll = () => { ... }

// 执行批量更新
const handleBulkUpdate = async () => { ... }
```

### 2. 后端 API 改进 (`/src/app/api/tasks/bulk/route.ts`)

#### 新建批量更新接口
- **端点**: `PATCH /api/tasks/bulk`
- **请求体**:
  ```json
  {
    "taskIds": [1, 2, 3],
    "status": "in_progress",
    "priority": "high",
    "owner": "张三",
    "actor": "user",
    "meta": { "reason": "bulk_update" }
  }
  ```
- **响应**:
  ```json
  {
    "success": true,
    "updatedCount": 3,
    "taskIds": [1, 2, 3],
    "updated": {
      "status": "in_progress",
      "priority": "high",
      "owner": "张三"
    }
  }
  ```

#### 功能特性
- 支持批量更新状态、优先级、负责人、下一步行动、截止日期
- 自动记录状态变更事件到 `task_events` 表
- 事务处理确保数据一致性
- 动态构建 UPDATE 语句（只更新提供的字段）

---

## 交付物

- [x] TaskBoard 组件支持复选框和批量选择
- [x] 批量操作工具栏（选中后显示）
- [x] 全选/取消全选功能
- [x] 批量更新 API (`/api/tasks/bulk`)
- [x] 加载状态显示
- [x] 成功后自动刷新列表
- [x] 与现有 UI 风格一致
- [x] npm run build 通过

---

## 使用示例

### 1. 选择任务
- 点击任务卡片/行左侧的复选框
- 或使用"全选"按钮选择当前页面所有任务

### 2. 批量操作
1. 选中任务后，顶部显示批量操作工具栏
2. 选择要修改的状态（可选）
3. 选择要修改的优先级（可选）
4. 输入负责人（可选）
5. 点击"应用"按钮

### 3. 完成
- 显示加载动画
- 批量更新所有选中任务
- 自动刷新任务列表
- 工具栏自动关闭

---

## 技术细节

### 数据库事务
批量更新使用数据库事务确保原子性：
```sql
BEGIN;
UPDATE tasks SET status = $1, priority = $2, owner = $3, updated_at = NOW() 
WHERE id IN ($4, $5, $6);
-- Insert event records for status changes
COMMIT;
```

### 事件记录
状态变更时自动记录到 `task_events` 表：
```sql
INSERT INTO task_events (task_id, event_type, from_status, to_status, actor, meta, created_at)
VALUES ($1, 'status_change', $2, $3, $4, $5, NOW())
```

### UI 状态管理
- 使用 `Set<number>` 存储选中的任务 ID（O(1) 查找）
- 批量模式自动激活（选中任意任务时）
- 刷新列表时自动清空选择（避免 stale selection）

---

## 测试步骤

1. ✅ 访问任务看板页面
2. ✅ 点击任意任务左侧复选框
3. ✅ 验证批量操作工具栏出现
4. ✅ 验证显示"已选择 1 个任务"
5. ✅ 点击"全选"按钮
6. ✅ 验证所有任务被选中
7. ✅ 选择状态"进行中"
8. ✅ 点击"应用"按钮
9. ✅ 验证显示加载动画
10. ✅ 验证任务状态批量更新
11. ✅ 验证列表自动刷新
12. ✅ 验证工具栏自动关闭
13. ✅ npm run build 通过

---

## 代码变更摘要

### 修改的文件
1. `/src/components/dashboard/TaskBoard.tsx`
   - 新增批量操作状态管理
   - 新增批量操作工具栏 UI
   - 增强 SortableTaskItem 和 TaskItem 支持复选框
   - 新增批量选择处理函数
   - 新增批量更新处理函数

2. `/src/app/api/tasks/bulk/route.ts` (新建)
   - 实现批量更新 API 端点
   - 支持多字段动态更新
   - 事务处理确保数据一致性
   - 自动记录状态变更事件

### 新增的类型
```typescript
interface BulkUpdatePayload {
  taskIds: number[];
  status?: string;
  priority?: string;
  owner?: string;
  actor?: string;
  meta?: Record<string, any>;
}
```

---

## 兼容性

- ✅ 向后兼容：现有单任务更新 API 保持不变
- ✅ 渐进增强：不选择任务时 UI 无变化
- ✅ 响应式设计：工具栏在小屏幕上自动换行
- ✅ 暗色模式：使用 CSS 变量，自动适配

---

## 性能优化

- 使用 `Set` 数据结构存储选中 ID（O(1) 查找）
- 批量更新单次数据库查询（而非 N 次）
- 事务处理减少数据库往返
- 前端状态管理避免不必要的重渲染

---

## 后续改进建议

1. 添加批量删除功能
2. 添加批量修改截止日期功能
3. 添加批量修改下一步行动功能
4. 添加撤销批量操作功能
5. 添加批量操作确认对话框
6. 添加批量操作结果摘要（成功/失败数量）
7. 支持跨页选择（当前仅支持当前页）

---

## 备注

- 批量操作工具栏仅在选择至少一个任务时显示
- 刷新列表时自动清空选择状态
- 应用按钮在所有字段都为空时禁用
- 加载状态通过沙漏图标动画显示
- 与现有 TaskBoard 组件风格完全一致
