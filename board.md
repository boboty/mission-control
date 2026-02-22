# 任务看板 - 开发记录

## 当前任务

### T-20260222-003 - 任务看板单模块视图改进

**状态**: 进行中  
**优先级**: 高  
**创建时间**: 2026-02-22  

#### 需求描述
在 mission-control 中改进"任务看板"单模块视图，提供完整列表（不只前 5 条），支持分页/加载更多与筛选。

#### 最低要求
1. ✅ 显示状态分组或状态筛选（todo/in_progress/blocked/done）
2. ✅ 提供搜索（按标题/ID）
3. ✅ 提供分页（pageSize=20，上一页/下一页）
4. ✅ 保留点击条目打开 DetailModal

#### 实现内容

**API 改进** (`/src/app/api/tasks/route.ts`):
- 添加分页参数：`page`, `pageSize` (默认 20)
- 添加状态筛选：`status` (todo/in_progress/blocked/done)
- 添加搜索：`search` (支持标题模糊搜索和 ID 精确匹配)
- 添加排序：`sortBy` (default/priority/dueDate/status)
- 返回分页元数据：total, totalPages, hasMore

**前端改进** (`/src/app/page.tsx`):
- 搜索框：支持按标题或 ID 搜索
- 状态下拉筛选：全部/待办/进行中/已阻塞/已完成
- 排序下拉：默认/优先级/截止日期/状态
- 视图切换：列表视图 / 分组视图
- 分页控制：上一页/下一页，显示当前页/总页数
- 单模块视图：点击左侧导航"任务看板"进入完整列表视图
- 保留 DetailModal：点击任务条目打开详情浮窗

#### 交付物
- [x] 自测通过
- [x] 至少 1 张截图 (docs/screenshot-dashboard.png, docs/screenshot-taskboard-single.png)
- [x] 关键 /api/tasks 响应样例 (见下方)
- [x] npm run build 通过
- [x] 本地 commit（不 push）

#### API 响应样例

```json
{
  "tasks": [
    {
      "id": 1,
      "title": "示例任务",
      "status": "in_progress",
      "priority": "high",
      "owner": "张三",
      "blocker": false,
      "next_action": "等待代码审查",
      "due_at": "2026-02-25T00:00:00Z",
      "updated_at": "2026-02-22T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 45,
    "totalPages": 3,
    "hasMore": true
  },
  "filters": {
    "status": "",
    "search": "",
    "sortBy": "default"
  }
}
```

#### 测试步骤
1. ✅ 访问仪表盘，查看任务看板卡片（显示前 5 条 + 分页信息）
2. ✅ 点击左侧导航"任务看板"进入单模块视图
3. ✅ 测试搜索功能：`/api/tasks?search=MVP` → 返回 2 条包含"MVP"的任务
4. ✅ 测试状态筛选：`/api/tasks?status=blocked` → 返回 3 条阻塞任务
5. ✅ 测试排序：支持 default/priority/dueDate/status
6. ✅ 测试分页：总 27 条任务，pageSize=20，共 2 页，hasMore=true
7. ✅ 测试视图切换：列表视图 / 分组视图
8. ✅ 点击任务条目，验证 DetailModal 正常打开

#### 测试结果
- 构建：✅ `npm run build` 成功
- API 响应：✅ 分页、筛选、搜索均正常工作
- 截图：✅ docs/screenshot-dashboard.png（仪表盘视图）
- 截图：✅ docs/screenshot-taskboard-single.png（单模块视图）

#### 备注
- 单模块视图显示完整列表，无高度限制
- 仪表盘卡片视图保持简洁（显示前 5 条 + 分页信息）
- 所有筛选和搜索条件在 URL 参数中保持状态
