# Mission Control Calendar (Next.js + Convex)

统一管理计划任务与 Cron 任务的日历：
- 月视图日历
- 任务/cron 新增
- 负责人（你/我）
- 状态更新（planned/running/done/paused/failed）
- Convex 实时同步

## 初始化

```bash
cd mission-control
npm install
npx convex dev   # 首次登录并生成 .env.local + convex/_generated
```

## 启停服务（后台）

```bash
npm run svc:start
npm run svc:status
npm run svc:logs
npm run svc:stop
```

前端地址：`http://localhost:3000`
