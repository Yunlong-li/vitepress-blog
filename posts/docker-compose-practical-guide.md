---
title: Docker 使用教程：从镜像、容器到 Docker Compose 和生产部署
date: 2026-06-15
description: 系统讲解 Docker 的镜像、容器、Dockerfile、数据卷、网络、环境变量、日志、Docker Compose、多阶段构建、镜像仓库、安全和生产部署实践。
---

# Docker 使用教程：从镜像、容器到 Docker Compose 和生产部署

Docker 是把应用和运行环境一起打包、分发、运行的容器化工具。它解决的不是“虚拟一台完整机器”，而是让应用在不同机器上用尽量一致的文件系统、依赖和启动方式运行。

一句话理解：

> 镜像是应用运行环境的快照，容器是镜像启动后的进程，Compose 是把多个容器按一个应用来编排。

本文用一个“Node.js API + PostgreSQL + Redis”的小系统串起来：先写 Dockerfile，再用 Compose 编排数据库、缓存和应用，最后讲数据、网络、日志、安全和生产部署。

```mermaid
flowchart TD
  Code["应用代码"] --> Dockerfile["Dockerfile"]
  Dockerfile --> Image["镜像"]
  Image --> Container["容器"]
  Compose["Docker Compose"] --> Api["api 容器"]
  Compose --> DB["postgres 容器"]
  Compose --> Redis["redis 容器"]
  Container --> Logs["日志"]
  Container --> Volume["数据卷"]
  Container --> Network["容器网络"]
```

## 1. Docker 解决了什么问题

没有容器时，部署经常会遇到这些问题：

- 本地 Node.js 是 22，服务器是 18。
- 本地装了系统依赖，服务器没装。
- 应用启动需要数据库、Redis、队列，开发环境难以复现。
- 多个项目共用一台机器，端口、依赖、配置互相影响。
- 新人接项目，先花半天装环境。

Docker 的思路是把环境写成代码：

```txt
代码 + 运行时 + 系统依赖 + 启动命令 -> 镜像
镜像 + 环境变量 + 网络 + 数据卷 -> 容器
多个容器 + 依赖关系 -> Compose 应用
```

它不会替你设计架构，但能让环境更可复制。

## 2. 核心概念

| 概念 | 解释 |
| --- | --- |
| Image | 镜像，包含文件系统、依赖和默认命令 |
| Container | 容器，镜像运行起来后的进程 |
| Dockerfile | 构建镜像的说明书 |
| Registry | 镜像仓库，比如 Docker Hub、私有仓库 |
| Volume | 数据卷，用于持久化数据 |
| Network | 容器网络，用于容器互相访问 |
| Compose | 多容器应用编排工具 |

几个命令先建立直觉：

```bash
docker version
docker pull nginx:alpine
docker run --name web -p 8080:80 nginx:alpine
docker ps
docker logs web
docker stop web
docker rm web
```

访问：

```txt
http://localhost:8080
```

`-p 8080:80` 表示把宿主机 8080 端口映射到容器 80 端口。

## 3. 镜像和容器的关系

镜像是只读模板，容器是运行实例。

```mermaid
flowchart LR
  Registry["镜像仓库"] --> Pull["docker pull"]
  Pull --> Image["本地镜像"]
  Image --> Run["docker run"]
  Run --> Container["容器进程"]
```

查看镜像：

```bash
docker images
```

查看容器：

```bash
docker ps
docker ps -a
```

进入容器：

```bash
docker exec -it web sh
```

删除容器和镜像：

```bash
docker rm web
docker rmi nginx:alpine
```

容器删除后，容器内的临时文件也会丢失。需要持久化的数据要放到 Volume。

## 4. 写一个 Node.js Dockerfile

项目结构：

```txt
api
  package.json
  pnpm-lock.yaml
  src
    server.ts
  Dockerfile
  .dockerignore
```

`.dockerignore`：

```gitignore
node_modules
dist
.git
.env
*.log
```

Dockerfile：

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

构建：

```bash
docker build -t my-api:dev .
```

运行：

```bash
docker run --rm -p 3000:3000 my-api:dev
```

多阶段构建的好处是：构建依赖和最终运行镜像分开，最后镜像里只保留运行需要的文件。

## 5. Dockerfile 常见指令

| 指令 | 作用 |
| --- | --- |
| `FROM` | 指定基础镜像 |
| `WORKDIR` | 设置工作目录 |
| `COPY` | 复制文件到镜像 |
| `RUN` | 构建阶段执行命令 |
| `ENV` | 设置环境变量 |
| `EXPOSE` | 声明容器端口 |
| `CMD` | 容器默认启动命令 |
| `ENTRYPOINT` | 容器入口命令 |

`RUN` 在构建镜像时执行，`CMD` 在容器启动时执行。

```dockerfile
RUN pnpm build
CMD ["node", "dist/server.js"]
```

不要把密钥写进 Dockerfile：

```dockerfile
# 不要这样
ENV DATABASE_URL=postgresql://user:password@host/db
```

密钥应该通过运行时环境变量、Secret 管理或部署平台配置注入。

## 6. 数据卷

容器文件系统适合放应用代码，不适合放数据库数据。数据库要使用 volume。

```bash
docker volume create pg_data

docker run --name pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app \
  -v pg_data:/var/lib/postgresql/data \
  -p 5432:5432 \
  -d postgres:16
```

查看 volume：

```bash
docker volume ls
docker volume inspect pg_data
```

删除 volume 要谨慎：

```bash
docker volume rm pg_data
```

Volume 是数据边界。删容器不等于删数据，删 volume 才可能真的删库。

## 7. 容器网络

单独 `docker run` 时，容器之间如果要互相访问，最好放到同一个 network。

```bash
docker network create app_net
```

启动 PostgreSQL：

```bash
docker run --name pg \
  --network app_net \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app \
  -d postgres:16
```

启动 API：

```bash
docker run --name api \
  --network app_net \
  -e DATABASE_URL=postgresql://postgres:postgres@pg:5432/app \
  -p 3000:3000 \
  -d my-api:dev
```

同一个 Docker network 里可以用容器名当主机名。这里 API 访问数据库用的是 `pg:5432`，不是 `localhost:5432`。

## 8. Docker Compose 入门

当一个应用包含多个容器时，手写很多 `docker run` 会很难维护。Compose 用一个 YAML 文件描述多容器应用。

`compose.yaml`：

```yaml
services:
  api:
    build:
      context: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/app
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis_data:/data

volumes:
  pg_data:
  redis_data:
```

启动：

```bash
docker compose up -d
```

查看：

```bash
docker compose ps
docker compose logs -f api
```

停止：

```bash
docker compose down
```

如果要连同 volume 一起删除：

```bash
docker compose down -v
```

这个命令会删除数据，开发环境可以用，生产环境要非常谨慎。

## 9. Compose 中的依赖和健康检查

`depends_on` 只表示启动顺序，不等于数据库已经可用。更稳的做法是加 healthcheck。

```yaml
services:
  api:
    build: .
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: app
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d app"]
      interval: 5s
      timeout: 3s
      retries: 10
```

即便加了 healthcheck，应用仍应该自己处理数据库短暂不可用，因为生产环境里的网络、迁移、重启都可能导致瞬时失败。

## 10. 开发环境 Compose

开发时通常希望代码改了容器内立即生效，可以用 bind mount。

```yaml
services:
  api:
    image: node:22-alpine
    working_dir: /app
    command: sh -c "corepack enable && pnpm install && pnpm dev"
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - api_node_modules:/app/node_modules
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/app
    depends_on:
      - postgres

volumes:
  api_node_modules:
```

注意：

- `.:/app` 把本地代码挂进容器。
- 单独挂 `api_node_modules`，避免宿主机和容器系统差异污染依赖。
- 开发 Compose 和生产 Compose 可以拆成两个文件。

常见文件：

```txt
compose.yaml
compose.dev.yaml
compose.prod.yaml
```

合并启动：

```bash
docker compose -f compose.yaml -f compose.dev.yaml up
```

## 11. 环境变量和配置

Compose 可以读取 `.env`：

```env
POSTGRES_PASSWORD=postgres
POSTGRES_DB=app
API_PORT=3000
```

在 `compose.yaml` 中使用：

```yaml
services:
  api:
    ports:
      - "${API_PORT}:3000"
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
```

注意：

- `.env` 用于 Compose 变量替换，不等于自动注入所有服务。
- 真正传入容器要写在 `environment` 或 `env_file`。
- 真实密钥不要提交到 Git。

## 12. 镜像标签和仓库

构建镜像：

```bash
docker build -t registry.example.com/team/api:1.0.0 .
```

登录仓库：

```bash
docker login registry.example.com
```

推送：

```bash
docker push registry.example.com/team/api:1.0.0
```

标签建议：

- `1.0.0`：版本标签，适合回滚。
- `git-sha`：精确对应一次提交。
- `latest`：只适合开发或明确约定，不建议生产只依赖它。

生产部署应尽量使用不可变标签，比如 Git commit SHA。

## 13. 日志和排查

查看日志：

```bash
docker logs api
docker logs -f api
docker compose logs -f api
```

查看资源：

```bash
docker stats
```

查看容器详情：

```bash
docker inspect api
```

进入容器：

```bash
docker exec -it api sh
```

常见排查顺序：

1. `docker compose ps` 看服务是否退出。
2. `docker compose logs service` 看启动错误。
3. `docker inspect` 看环境变量、网络和挂载。
4. `docker exec` 进入容器测试连接。
5. 确认容器内访问其他服务用服务名，不是 `localhost`。

## 14. 安全实践

基础安全点：

- 使用官方或可信基础镜像。
- 优先使用更小的运行镜像。
- 不在镜像里写密钥。
- 不用 root 运行应用进程。
- 固定镜像版本，不盲目使用 `latest`。
- CI 中做镜像漏洞扫描。
- 只暴露必须端口。
- 生产数据库不要随意映射到公网端口。

非 root 用户示例：

```dockerfile
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --chown=app:app dist ./dist
USER app
CMD ["node", "dist/server.js"]
```

## 15. 生产部署思路

小型项目可以直接在服务器上用 Compose：

```bash
docker compose pull
docker compose up -d
docker image prune -f
```

更规范的流程：

```mermaid
sequenceDiagram
  participant Dev as 开发者
  participant CI as CI
  participant Reg as 镜像仓库
  participant Host as 服务器

  Dev->>CI: push code
  CI->>CI: test and build image
  CI->>Reg: push image:git-sha
  Host->>Reg: pull image
  Host->>Host: docker compose up -d
```

如果服务数量变多、需要自动扩缩容、滚动发布、服务发现和更强的调度能力，就要考虑 Kubernetes、Nomad 或云厂商容器平台。

## 16. 常见坑

### 16.1 容器里访问 localhost

容器里的 `localhost` 是容器自己，不是宿主机，也不是另一个容器。Compose 内访问数据库应使用服务名：

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
```

### 16.2 忘记持久化数据库数据

数据库容器不挂 volume，容器删除后数据就没了。

### 16.3 镜像构建很慢

把依赖文件先复制进去，再安装依赖，可以利用缓存：

```dockerfile
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
```

### 16.4 开发和生产 Compose 混在一起

开发要 bind mount 和热更新，生产要固定镜像和稳定配置。两个场景最好拆开。

## 17. 面试表达

可以这样讲 Docker：

> Docker 用镜像封装应用运行环境，用容器运行镜像实例，用 volume 持久化数据，用 network 连接容器。Dockerfile 描述镜像构建过程，Docker Compose 描述多容器应用。实际项目里重点关注镜像层缓存、多阶段构建、环境变量、数据卷、容器网络、日志排查、非 root 运行和生产镜像标签管理。

## 18. 总结

学习 Docker 的主线：

- 先理解镜像和容器。
- 再学 Dockerfile 构建应用镜像。
- 用 volume 管数据，用 network 连服务。
- 用 Compose 编排多容器应用。
- 最后补齐日志、安全、镜像仓库和生产部署。

Docker 的价值不是“命令会背多少”，而是让应用环境可复制、可交付、可排查。
