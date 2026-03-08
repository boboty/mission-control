# Feishu Bitable 同步脚本

将 Mission Control 的任务看板 (board.md) 同步到飞书多维表格 (Bitable)。

## 功能

- ✅ 解析 `board.md` 中的任务
- ✅ 同步任务到飞书多维表格
- ✅ 支持增量同步（只同步变更的任务）
- ✅ 字段映射：
  - 任务 ID → 编号
  - 标题 → 任务名称
  - 状态 → 状态（单选）
  - 优先级 → 优先级（单选）
  - 负责人 → 负责人（文本）
  - 截止日期 → 截止日期（日期）

## 配置

### 1. 创建飞书自建应用

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 App ID 和 App Secret

### 2. 配置应用权限

在应用管理后台添加以下权限：

- 多维表格
  - 获取多维表格数据
  - 编辑多维表格数据

### 3. 配置环境变量

复制 `.env.example` 为 `.env.local` 并配置：

```bash
# Feishu Bitable Sync
FEISHU_APP_ID="cli_xxxxxxxxxxxxx"
FEISHU_APP_SECRET="xxxxxxxxxxxxxxxxxxxxx"
FEISHU_BITABLE_APP_TOKEN="basxxxxxxxxxxxxx"
FEISHU_BITABLE_TABLE_ID="tblxxxxxxxxxxxxx"
```

**获取 Bitable App Token 和 Table ID：**

1. 打开飞书多维表格
2. URL 格式：`https://xxx.feishu.cn/base/APP_TOKEN?table=TABLE_ID`
3. `APP_TOKEN` 即 `FEISHU_BITABLE_APP_TOKEN`
4. `TABLE_ID` 即 `FEISHU_BITABLE_TABLE_ID`

### 4. 配置多维表格字段

在飞书多维表格中创建以下字段：

| 字段名称 | 字段类型 | 说明 |
|---------|---------|------|
| 编号 | 文本 | 任务 ID（如：T-20260308-078） |
| 任务名称 | 文本 | 任务标题 |
| 状态 | 单选 | 待处理/进行中/阻塞/已完成 |
| 优先级 | 单选 | P0 - 紧急/P1 - 高/P2 - 中 |
| 负责人 | 文本 | 负责人姓名 |
| 截止日期 | 日期 | 任务截止日期 |

## 使用方法

### 基本用法

```bash
cd ~/github/mission-control
node scripts/sync-to-feishu.mjs
```

### 输出示例

```
🚀 Starting Feishu Bitable sync...

📄 Parsing /home/pve/github/mission-control/board.md...
   Found 15 tasks

🔑 Getting Feishu access token...
   ✓ Token obtained

📋 Fetching existing records from Bitable...
   Found 10 existing records

🔄 Syncing tasks...

   ✏️  Updating: T-20260308-078 - 记忆归档 API + UI...
   ⏭️  Unchanged: T-20260222-003
   ➕ Creating: T-20260308-082 - UI 美化与调优...

✅ Sync completed!

📊 Summary:
   - Created: 5
   - Updated: 3
   - Unchanged: 7
   - Total: 15

🎯 All tasks synced successfully
```

## 任务状态映射

| board.md 状态 | Bitable 状态 |
|-------------|------------|
| ✅ 已完成 | 已完成 |
| 🔄 进行中 | 进行中 |
| 🚫 阻塞 | 阻塞 |
| ⏳ 待处理 | 待处理 |

## 任务优先级映射

| board.md 优先级 | Bitable 优先级 |
|---------------|--------------|
| P0 | P0 - 紧急 |
| P1 | P1 - 高 |
| P2 | P2 - 中 |

## 定时同步

可以使用 cron 定时执行同步：

```bash
# 每天上午 9 点同步
0 9 * * * cd ~/github/mission-control && node scripts/sync-to-feishu.mjs >> logs/feishu-sync.log 2>&1
```

## 故障排查

### 错误：Failed to get access token

- 检查 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 是否正确
- 确认应用已发布

### 错误：Failed to list records / create record

- 检查 `FEISHU_BITABLE_APP_TOKEN` 和 `FEISHU_BITABLE_TABLE_ID` 是否正确
- 确认应用有多维表格权限
- 确认多维表格存在且可访问

### 错误：board.md not found

- 确保在 `~/github/mission-control` 目录下运行
- 确认 `board.md` 文件存在

## 注意事项

1. 首次运行会创建所有任务记录
2. 后续运行只同步变更的任务（增量同步）
3. 删除 board.md 中的任务不会删除 Bitable 中的记录
4. 状态字段需要预先在 Bitable 中配置好选项
