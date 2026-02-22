# Iconfont 图标接入指南

## 📦 当前状态

项目已封装统一的 `Icon` 组件，支持 Iconfont symbol 方式和 emoji 降级方案。

## 🔧 接入步骤

### 方式一：使用 Iconfont 在线链接（推荐）

1. **访问收藏集**
   - 打开：https://www.iconfont.cn/collections/detail?cid=53496
   - 如果收藏集是公开的，继续下一步
   - 如果需要登录，请使用方式二

2. **获取 Symbol 代码**
   - 在收藏集页面点击 "Symbol" 标签
   - 复制页面下方的 JS 链接，格式类似：`//at.alicdn.com/t/c/font_xxxxxx.js`

3. **配置项目**
   
   **方案 A：在 layout.tsx 中引入（推荐）**
   
   打开 `src/app/layout.tsx`，在 `<head>` 中添加：
   ```tsx
   <script src="//at.alicdn.com/t/c/font_xxxxxx.js"></script>
   ```
   
   **方案 B：在 Icon.tsx 中配置**
   
   打开 `src/components/Icon.tsx`，找到第 18 行：
   ```typescript
   const ICONFONT_SYMBOL_URL = '//at.alicdn.com/t/c/font_xxxxxx.js';
   ```
   将你的 JS 链接填入

### 方式二：下载本地使用（适用于需要登录的收藏集）

1. **下载图标**
   - 登录 Iconfont
   - 进入收藏集：https://www.iconfont.cn/collections/detail?cid=53496
   - 选择需要的图标，添加到项目
   - 下载生成的 Symbol 代码

2. **放置文件**
   - 将下载的 `iconfont.js` 文件放到 `public/` 目录
   - 或复制到 `src/components/iconfont.js`

3. **引入文件**
   
   在 `src/app/layout.tsx` 的 `<head>` 中添加：
   ```tsx
   <script src="/iconfont.js"></script>
   ```

## 🎨 图标名称映射

在 `src/components/Icon.tsx` 中已定义图标名称映射：

```typescript
const ICON_MAP: Record<string, string> = {
  // 模块图标
  'dashboard': 'icon-dashboard',
  'tasks': 'icon-tasks',
  'pipelines': 'icon-pipeline',
  'events': 'icon-calendar',
  'memories': 'icon-archive',
  'agents': 'icon-team',
  'health': 'icon-heart',
  
  // 指标卡图标
  'metrics': 'icon-metrics',
  'in-progress': 'icon-sync',
  'blocked': 'icon-warning',
  'pending': 'icon-think',
  
  // 空态图标
  'empty-tasks': 'icon-empty-tasks',
  'empty-pipeline': 'icon-empty-pipeline',
  'empty-calendar': 'icon-empty-calendar',
  'empty-archive': 'icon-empty-archive',
  'empty-team': 'icon-empty-team',
  'empty-heart': 'icon-empty-heart',
  'empty-inbox': 'icon-inbox',
};
```

**重要：** 请根据 Iconfont 收藏集中的实际图标名称调整上述映射。

## 📝 使用示例

### 基础使用

```tsx
import { Icon } from '@/components';

// 使用预设图标
<Icon name="tasks" size={24} />

// 自定义颜色
<Icon name="success" color="#10b981" size={32} />
```

### 在组件中使用

```tsx
import { CardHeader, EmptyState, Metric } from '@/components';

// 卡片头部
<CardHeader 
  icon="tasks"  // 使用图标名称
  title="任务看板"
/>

// 空状态
<EmptyState 
  icon="empty-tasks" 
  title="暂无任务"
/>

// 指标卡
<Metric 
  label="任务总数" 
  value={10} 
  icon="metrics"
/>
```

## 🔄 降级方案

如果 Iconfont 未加载或 URL 未配置，组件会自动降级到 emoji：

```tsx
// 自动降级
<Icon name="tasks" /> // 如果 Iconfont 未加载，显示 📋

// 强制使用 emoji
<Icon name="tasks" useEmoji={true} />
```

## 🎯 替换范围

已完成 emoji 替换的位置：

1. ✅ **页面顶部** - 系统状态指示器
2. ✅ **指标卡** - 4 个指标卡片图标
3. ✅ **6 个模块卡片** - 任务看板、流程管线、日历、记忆归档、团队概览、运行健康
4. ✅ **空状态** - 各模块空态图标
5. ✅ **错误提示** - 错误消息图标

## 🐛 常见问题

### Q: 图标不显示？
A: 检查以下几点：
1. Iconfont JS 是否正确引入
2. 图标名称是否在 `ICON_MAP` 中定义
3. 浏览器控制台是否有 CORS 错误

### Q: 如何添加新图标？
A: 
1. 在 Iconfont 收藏集中添加图标
2. 更新 `ICON_MAP` 映射
3. 更新 `EMOJI_FALLBACK` 降级方案

### Q: 暗色模式下图标颜色不对？
A: 使用 `color` 属性指定颜色，或使用 CSS 变量：
```tsx
<Icon name="tasks" color="var(--color-primary)" />
```

## 📚 相关文件

- `src/components/Icon.tsx` - Icon 组件实现
- `src/components/index.ts` - 组件导出
- `src/app/layout.tsx` - 全局布局（引入 Iconfont JS）
- `src/app/globals.css` - 全局样式（包含 .icon 类）

## 🔗 链接

- [Iconfont 收藏集](https://www.iconfont.cn/collections/detail?cid=53496)
- [Iconfont 官方文档](https://www.iconfont.cn/pages/help.html)
