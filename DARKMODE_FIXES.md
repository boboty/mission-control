# 暗色模式修复说明

## 🎨 修复概述

针对暗色模式下卡片发白、对比度不足的问题进行了全面修复。

## 📋 修复清单

### 1. **背景层级优化** ✅
- **页面背景**: `--bg-primary: #020617` (深蓝黑，更深)
- **面板/卡片背景**: `--bg-secondary: #1e293b` (蓝灰色，不发白)
- **次级背景**: `--bg-tertiary: #334155` (hover 状态)
- **Elevated 卡片**: `--bg-elevated: #334155`

**效果**: 背景层级清晰，卡片不再发白

### 2. **卡片组件修复** ✅
- 添加 `dark:bg-slate-800` 类
- 边框颜色：`dark:border-slate-700`
- Hover 边框：`dark:hover:border-slate-600`
- 骨架屏背景：`dark:bg-slate-700`

**文件**: `src/components/Card.tsx`

### 3. **文字颜色优化** ✅
- 主文字：`dark:text-slate-100`
- 次级文字：`dark:text-slate-400`
- 弱化文字：`dark:text-slate-500`
- 所有文字在暗色下都有合适的对比度

### 4. **状态标签/徽标修复** ✅
- 成功状态：`dark:bg-emerald-900/30 dark:text-emerald-300`
- 警告状态：`dark:bg-amber-900/30 dark:text-amber-300`
- 错误状态：`dark:bg-rose-900/30 dark:text-rose-300`
- 普通状态：`dark:bg-slate-800 dark:text-slate-300`

**文件**: `src/components/StatusBadge.tsx`

### 5. **指标卡修复** ✅
- 背景：`dark:bg-slate-800`
- 边框：`dark:border-slate-700`
- 图标背景：`dark:bg-blue-900/20` 等半透明色
- 图标文字：`dark:text-blue-400` 等亮色

**文件**: `src/components/Metric.tsx`

### 6. **边框与分隔线修复** ✅
- 普通边框：`dark:border-slate-700`
- 列表项分隔：`dark:border-slate-700`
- Hover 背景：`dark:hover:bg-slate-800`

**文件**: `src/app/page.tsx`, `src/app/globals.css`

## 🎯 关键改进点

### 色彩变量系统
```css
/* 暗色模式变量 */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-primary: #020617;       /* 页面最底层 - 更深 */
    --bg-secondary: #1e293b;     /* 卡片背景 - 深蓝灰 */
    --bg-tertiary: #334155;      /* hover 等 */
    
    --border-light: #334155;     /* 可见但不过亮 */
    --border-medium: #475569;
    
    --text-primary: #f8fafc;     /* 文字反转 */
    --text-secondary: #e2e8f0;
    --text-tertiary: #cbd5e1;
  }
}
```

### 组件暗色类
所有组件都添加了 `dark:` 前缀的 Tailwind 类：
- `dark:bg-slate-800`
- `dark:border-slate-700`
- `dark:text-slate-100`
- `dark:text-slate-400`

### 半透明背景
指标卡图标使用半透明背景，避免纯色块：
- `dark:bg-blue-900/20`
- `dark:bg-emerald-900/20`
- `dark:bg-amber-900/20`

## 📱 测试建议

### 手动测试步骤
1. 在系统设置中切换到暗色模式
2. 打开页面，检查以下项目：
   - [ ] 卡片背景是否发白
   - [ ] 文字是否清晰可读
   - [ ] 边框是否可见但不过亮
   - [ ] Hover 效果是否明显
   - [ ] 状态标签颜色是否正确
   - [ ] 指标卡图标背景是否和谐

### 自动检测
页面会自动检测系统偏好：
```css
@media (prefers-color-scheme: dark) {
  /* 暗色模式样式自动应用 */
}
```

## 📂 修改文件

1. `src/styles/variables.css` - CSS 变量系统
2. `src/app/globals.css` - 全局样式
3. `src/components/Card.tsx` - 卡片组件
4. `src/components/Metric.tsx` - 指标组件
5. `src/components/StatusBadge.tsx` - 状态标签
6. `src/app/page.tsx` - 主页面

## 🎨 设计原则

1. **层级清晰**: 页面背景 < 面板背景 < 卡片
2. **对比度舒适**: 文字与背景对比度符合 WCAG 标准
3. **不过亮**: 边框和 hover 效果在暗色下柔和
4. **一致性**: 所有组件使用统一的色彩系统

## 🔧 后续优化建议

1. 添加暗色模式切换按钮（可选）
2. 为图表/数据可视化添加暗色主题
3. 测试更多组件在暗色下的表现
4. 考虑添加自动/手动/跟随系统三种模式
