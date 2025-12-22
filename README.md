# 全栈应用 - Next.js + Nest.js + PostgreSQL

这是一个使用 Next.js、Nest.js、PostgreSQL 和 Sequelize 构建的全栈应用项目。

## 技术栈

- **前端**: Next.js 14 (App Router), React 18, TypeScript
- **后端**: Nest.js, TypeScript
- **数据库**: PostgreSQL
- **ORM**: Sequelize
- **API 文档**: Swagger

## 项目结构

```
proj/
├── backend/          # Nest.js 后端
│   ├── src/
│   │   ├── users/   # 用户模块示例
│   │   ├── config/  # 配置文件
│   │   └── ...
│   └── package.json
├── frontend/        # Next.js 前端
│   ├── app/         # Next.js App Router
│   └── package.json
├── docker-compose.yml
└── README.md
```

## 快速开始

### 1. 启动 PostgreSQL 数据库

```bash
docker-compose up -d
```

### 2. 配置后端环境变量

```bash
cd backend
cp .env.example .env
# 根据需要编辑 .env 文件
```

### 3. 安装后端依赖并启动

```bash
cd backend
npm install
npm run start:dev
```

后端将在 `http://localhost:3001` 运行
Swagger 文档在 `http://localhost:3001/api`

### 4. 安装前端依赖并启动

```bash
cd frontend
npm install
npm run dev
```

前端将在 `http://localhost:3000` 运行

## 环境变量

### 后端 (.env)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=mydb
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 前端

前端使用 `NEXT_PUBLIC_API_URL` 环境变量，默认值为 `http://localhost:3001`

## API 端点

- `GET /` - 健康检查
- `GET /users` - 获取所有用户
- `GET /users/:id` - 获取单个用户
- `POST /users` - 创建用户
- `PATCH /users/:id` - 更新用户
- `DELETE /users/:id` - 删除用户

## Swagger 文档

启动后端后，访问 `http://localhost:3001/api` 查看完整的 API 文档。

## 开发

### 后端开发

```bash
cd backend
npm run start:dev    # 开发模式（热重载）
npm run build        # 构建
npm run start:prod   # 生产模式
npm run lint         # 代码检查
```

### 前端开发

```bash
cd frontend
npm run dev          # 开发模式
npm run build        # 构建
npm run start        # 生产模式
npm run lint         # 代码检查
```

## 数据库迁移

Sequelize 在开发模式下会自动同步数据库结构。在生产环境中，建议使用迁移文件。

## 许可证

MIT








# cards2025
