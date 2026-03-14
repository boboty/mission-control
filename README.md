# Mission Claw

<img src="public/logo.png" alt="Mission Claw Logo" width="120" />

> **Mission Claw** 是一款面向 AI Agent 团队的任务管理与自动化巡检系统。通过可视化的任务看板、智能决策中心和定时心跳巡检，帮助 AI 团队高效协作、自动推进阻塞任务。

## 预览

### 仪表盘
![Dashboard](docs/screenshot-dashboard.jpg)

### 任务看板
![TaskBoard](docs/screenshot-taskboard.jpg)

### 看板视图
![Kanban](docs/screenshot-kanban.jpg)

## 核心功能

- **任务看板**：支持列表/分组/看板三种视图，拖拽更新状态，实时同步
- **决策中心**：自动识别阻塞/待决策任务，智能推进工作流
- **自动巡检**：Cron 定时检查任务状态，自动标记和告警阻塞任务
- **数据可视化**：核心指标趋势对比，团队效率分析
- **多 Agent 协作**：支持多 AI Agent 同时在线，状态实时同步

## 技术栈

| 类别 | 技术 |
|------|------|
| **前端** | Next.js 14 + React 18 + TypeScript |
| **样式** | Tailwind CSS 4 |
| **状态管理** | React Hooks + Context |
| **拖拽** | @dnd-kit |
| **虚拟滚动** | @tanstack/react-virtual |
| **后端** | Next.js API Routes + PostgreSQL |
| **数据库** | Supabase (PostgreSQL + Realtime) |
| **3D 渲染** | Three.js + React Three Fiber |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/boboty/mission-control.git
cd mission-control
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的配置：

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 生产构建
npm run start    # 启动生产服务器
npm run lint     # 代码检查
```

## 项目结构

```
mission-control/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── api/          # API 路由
│   │   ├── dashboard/    # 仪表盘页面
│   │   └── page.tsx      # 主页面
│   ├── components/       # React 组件
│   │   ├── dashboard/    # 仪表盘组件
│   │   ├── task/         # 任务相关组件
│   │   └── ui/           # 通用 UI 组件
│   └── lib/              # 工具函数与类型
├── db/                   # 数据库脚本与迁移
├── docs/                 # 文档与截图
├── public/               # 静态资源
└── scripts/              # 辅助脚本
```

## 部署

### Vercel（推荐）

1. Fork 本项目
2. 在 Vercel 导入项目
3. 添加环境变量 `DATABASE_URL`
4. Deploy

### Docker 部署

```bash
docker-compose -f docker-compose.dev.yml up
```

### 自托管

```bash
npm run build
npm start
```

需要 PostgreSQL 数据库支持。

## 相关文档

- [架构说明](ARCHITECTURE.md)
- [图标字体设置](ICONFONT_SETUP.md)
- [任务看板说明](board.md)

## License

MIT
