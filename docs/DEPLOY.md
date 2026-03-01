# 部署指南

## Vercel 部署（推荐）

### 1. Fork 项目
访问 https://github.com/boboty/mission-control 点击 Fork

### 2. Vercel 导入
1. 登录 vercel.com
2. 点击 "Add New..." → "Project"
3. 选择刚刚 Fork 的仓库
4. 点击 "Deploy"

### 3. 环境变量
在 Vercel 项目设置中添加：

```
DATABASE_URL=postgresql://postgres:<password>@db.xxxx.supabase.co:5432/postgres
```

### 4. 部署完成
Vercel 会自动构建并部署，分配一个 .vercel.app 域名。

---

## 自托管部署

### 前提
- Node.js 18+
- PostgreSQL 数据库

### 步骤

```bash
# 1. 克隆
git clone https://github.com/boboty/mission-control.git
cd mission-control

# 2. 安装
npm install

# 3. 配置
cp .env.example .env.local
# 编辑 .env.local 填入 DATABASE_URL

# 4. 构建
npm run build

# 5. 运行
npm start
```

### Docker 部署（可选）

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t mission-control .
docker run -p 3000:3000 -e DATABASE_URL=xxx mission-control
```

---

## 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| DATABASE_URL | ✅ | PostgreSQL 连接字符串 |

---

## 注意事项

1. **数据库**：需要 Supabase PostgreSQL 或自建 PostgreSQL
2. **初始化**：首次部署后需初始化数据库表（运行 `db/init.sql`）
3. **域名**：可绑定自定义域名
