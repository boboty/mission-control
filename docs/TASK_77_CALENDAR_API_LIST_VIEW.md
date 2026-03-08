# 任务 #77 - Calendar API + List 视图

**状态**: ✅ 已完成  
**完成时间**: 2026-03-08  
**优先级**: P0

---

## 概述

实现 Calendar API 集成（读取事件、创建事件）和 List 视图展示日历事件，与现有 TaskBoard/Pipeline 组件风格一致。

---

## 实现内容

### 1. Calendar API 增强

**文件**: `/src/app/api/events/route.ts`

#### GET 方法（已存在，优化）
- ✅ 支持分页：`page`, `pageSize` (默认 20)
- ✅ 支持类型筛选：`type`
- ✅ 支持搜索：`search` (标题模糊搜索和 ID 精确匹配)
- ✅ 支持日期范围：`from`, `to`
- ✅ 支持视图模式：`view` (upcoming/all)
- ✅ 支持时区：`tz`
- ✅ 返回分页元数据：total, totalPages, hasMore

#### POST 方法（新增）
- ✅ 创建日历事件
- **请求体**:
  ```json
  {
    "title": "会议标题",
    "starts_at": "2026-03-10T14:00:00Z",
    "ends_at": "2026-03-10T15:00:00Z",
    "type": "meeting",
    "source": "google_calendar"
  }
  ```
- **必填字段**: `title`, `starts_at`
- **可选字段**: `ends_at`, `type` (默认 meeting), `source`
- **响应**: 返回创建的事件对象

**API 使用示例**:
```bash
# 获取事件列表
GET /api/events?page=1&pageSize=20&view=upcoming

# 创建事件
POST /api/events
Content-Type: application/json
{
  "title": "团队周会",
  "starts_at": "2026-03-10T14:00:00Z",
  "ends_at": "2026-03-10T15:00:00Z",
  "type": "meeting"
}
```

---

### 2. CalendarList 组件

**文件**: `/src/components/dashboard/CalendarList.tsx` (新建)

#### 功能特性
- ✅ **搜索功能**: 支持按标题或 ID 搜索
- ✅ **视图切换**: 近期日程 / 全部日程
- ✅ **类型筛选**: 全部类型 / 会议 / 截止 / 评审 / 其他
- ✅ **日期范围筛选**: 从/至 日期选择器
- ✅ **分页控制**: 上一页/下一页，显示页码和总页数
- ✅ **重置筛选**: 一键重置所有筛选条件
- ✅ **响应式设计**: 移动端/平板/桌面自适应

#### 视觉设计
- 与 TaskBoard/Pipeline 组件风格一致
- 使用统一的 CSS 变量和 design tokens
- 支持暗色模式
- hover 效果：-translate-y-0.5 + 阴影增强
- 类型标签使用彩色圆点标识

#### 子组件
- `CalendarListItem`: 单个日程项展示
- `Pagination`: 分页控制

---

### 3. 页面集成

**文件**: `/src/app/page.tsx`

#### 改动
- ✅ 导入 CalendarList 组件
- ✅ 在 events 单模块视图中使用 CalendarList
- ✅ 保持与现有模块一致的交互模式
- ✅ 点击日程项打开 DetailModal

---

### 4. 类型定义

**文件**: `/src/lib/types.ts` (已存在)

```typescript
export interface Event {
  id: number;
  title: string;
  starts_at: string;
  ends_at: string;
  type: string;
}
```

---

### 5. 数据转换

**文件**: `/src/lib/data-utils.ts` (已存在)

```typescript
export function eventToDetail(event: Event): DetailData {
  // 转换事件为详情数据，支持 DetailModal 展示
}
```

---

## 测试验证

### 构建测试
```bash
cd ~/github/mission-control
npm run build
# ✅ 构建成功 (exit code 0)
```

### 功能测试清单
- [x] GET /api/events - 获取事件列表
- [x] POST /api/events - 创建新事件
- [x] 分页功能 - 上一页/下一页
- [x] 搜索功能 - 按标题/ID 搜索
- [x] 类型筛选 - 按事件类型筛选
- [x] 日期范围筛选 - from/to 日期选择
- [x] 视图切换 - upcoming/all
- [x] 重置筛选 - 清空所有筛选条件
- [x] 点击事件 - 打开 DetailModal
- [x] 响应式布局 - 移动端/平板/桌面
- [x] 暗色模式 - 正常显示

---

## 文件改动

### 新增文件
1. `/src/components/dashboard/CalendarList.tsx` - 日历列表组件
2. `/docs/TASK_77_CALENDAR_API_LIST_VIEW.md` - 本文档

### 修改文件
1. `/src/app/api/events/route.ts` - 添加 POST 方法
2. `/src/app/page.tsx` - 集成 CalendarList 组件

---

## API 响应样例

### GET /api/events 响应
```json
{
  "events": [
    {
      "id": 1,
      "title": "团队周会",
      "starts_at": "2026-03-10T14:00:00Z",
      "ends_at": "2026-03-10T15:00:00Z",
      "type": "meeting",
      "source": null
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 15,
    "totalPages": 1,
    "hasMore": false
  },
  "filters": {
    "type": null,
    "source": null,
    "search": null,
    "from": null,
    "to": null,
    "view": "upcoming",
    "tz": "Asia/Shanghai"
  }
}
```

### POST /api/events 响应
```json
{
  "event": {
    "id": 2,
    "title": "产品评审",
    "starts_at": "2026-03-11T10:00:00Z",
    "ends_at": "2026-03-11T11:00:00Z",
    "type": "review",
    "source": null
  },
  "message": "Event created successfully"
}
```

---

## 视觉设计参考

### 日程项样式
- 左侧彩色圆点标识类型
- 标题显示在首行
- 时间信息在第二行（带日历图标）
- 类型标签在第三行
- hover 时有轻微上移和阴影增强

### 筛选栏布局
- 搜索框（带搜索图标）
- 视图切换下拉框
- 类型筛选下拉框
- 日期范围选择器（从/至）
- 重置筛选按钮

### 分页控制
- 显示当前页/总页数
- 上一页/下一页按钮
- 禁用状态自动处理

---

## 兼容性

- ✅ 功能与现有模块保持一致
- ✅ 所有改动向后兼容
- ✅ 暗色模式同步支持
- ✅ 响应式设计完整

---

## 后续建议

1. **事件创建 UI**: 可以在前端添加"新建日程"按钮和表单
2. **拖拽排序**: 参考 TaskBoard 实现拖拽调整事件顺序
3. **日历视图**: 可以添加月视图/周视图/日视图
4. **外部日历集成**: 支持 Google Calendar、Outlook 等导入
5. **事件提醒**: 添加事件开始前提醒功能

---

## 交付物

- [x] Calendar API (GET + POST)
- [x] CalendarList 组件
- [x] 页面集成
- [x] 构建测试通过
- [x] 文档完成
- [x] 本地 commit（不 push）

---

**备注**: 本次实现专注于 Calendar API 和 List 视图，与现有 TaskBoard/Pipeline 组件风格保持一致，提供了完整的筛选、搜索、分页功能。
