# 运行 epress 节点

本指南将帮助您部署和运行 `epress` 节点，适用于使用 Docker 或直接从源码运行的用户。根据您的需求，您可以选择以下两种方式之一：

1. **使用 Docker 部署**：适合希望快速部署或运行生产环境的普通用户。
2. **从源码运行**：适合开发者或需要自定义代码的用户。

---

## 使用 Docker 部署 epress 节点

本节介绍如何通过 Docker 运行 `epress` 节点。您可以选择以下两种方式之一：

- **使用官方预发布镜像**（推荐）：直接从 `ghcr.io/epressworld/epress` 获取预构建镜像，无需自己构建。
- **自定义构建镜像**：适用于需要特殊配置（如前后端分离）的用户。

### 1. 准备工作

在开始之前，请确保您的系统已安装以下软件：

- **Git**：用于克隆 `epress` 项目代码（仅自定义构建需要）。
- **Docker Desktop**（macOS/Windows）或 **Docker Engine**（Linux）：运行 Docker 容器的必备工具。请确保 Docker 服务正在运行。

### 2. 方法 1：使用官方预发布镜像

如果您无需特殊配置，推荐直接使用官方预构建的镜像 `ghcr.io/epressworld/epress:latest`，可以跳过构建步骤，直接运行节点。

#### 2.1 启动 epress 节点

使用以下命令启动您的节点。首次运行时，如果 `epress-data` 数据卷不存在，Docker 将自动创建它。

```bash
docker run -d \
  -p 8543:8543 -p 8544:8544 \
  -v epress-data:/app/data \
  --restart unless-stopped \
  --name my-epress-node \
  ghcr.io/epressworld/epress:latest
```

- `-d`：后台运行容器。
- `-p 8543:8543` (前端) 和 `-p 8544:8544` (后端): 映射必要的容器端口到您的主机。
- `-v epress-data:/app/data`：挂载 `epress-data` 数据卷以持久化节点的数据库和配置。
- `--restart unless-stopped`：确保节点在崩溃或系统重启时自动重启。
- `--name my-epress-node`：为容器命名，便于管理。

#### 2.2 通过 Web 界面完成设置

容器运行后，在浏览器中打开 `http://localhost:8543`。

您将被自动重定向到网页安装向导。这个用户友好的界面将引导您完成节点的配置。您在此处配置的设置（例如节点地址、标题和邮件服务器设置）将存储在 `epress-data` 数据卷内的数据库中。

### 3. 方法 2：自定义构建镜像

如果您有特殊需求（如前后端分离配置），需要克隆代码、修改配置并构建自定义 Docker 镜像。

#### 3.1 获取 epress 项目代码

克隆项目代码到本地：

```bash
git clone https://github.com/epressworld/epress.git
cd epress
```

#### 3.2 修改已有的 .env 文件 (可选)

代码库中已包含一个 `.env` 文件，其中有默认的基础设施配置。如果您需要为自定义镜像预设特定配置（例如，分离前后端时指定 `EPRESS_API_URL`），可以直接**修改**这个已有的文件。构建镜像时，您所做的修改将会被打包进去。

**示例：为分离后端修改 .env 文件**
```
# .env
EPRESS_API_URL=http://localhost:8544
```

应用级别的设置（如节点地址、标题等）仍然建议通过后续的 Web 安装向导进行配置。

#### 3.3 构建 Docker 镜像

构建您的自定义 `epress` 镜像：

```bash
docker build -t my-epress-custom:latest .
```

- `-t my-epress-custom:latest`：为镜像指定名称和标签。
- `.`：指向当前目录中的 Dockerfile。

#### 3.4 启动节点并通过 Web 配置

1.  **启动您的自定义容器**：
    ```bash
    docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --env-file .env --name my-epress-node my-epress-custom:latest
    ```
    - `--env-file .env`：将您的自定义基础架构变量传递给容器。

2.  **完成设置**：
    在浏览器中打开 `http://localhost:8543` 以访问网页版安装向导。

---

## 从源码运行 epress 节点

本节适用于希望从源码级别运行或开发 `epress` 节点的用户，适合开发者或不使用 Docker 的场景。

### 1. 准备工作

确保已安装以下软件：

- **Git**：用于克隆项目代码。
- **Node.js**：版本 20.x 或更高（从 [Node.js 官网](https://nodejs.org/) 下载）。
- **npm**：通常随 Node.js 安装。

### 2. 获取 epress 项目代码

克隆项目代码：

```bash
git clone https://github.com/epressworld/epress.git
cd epress
```

### 3. 安装项目依赖

安装必要的 Node.js 依赖：

```bash
npm install
```

### 4. 开发模式

使用热重载进行开发：

```bash
npm run dev
```

这将并行启动服务器和客户端，并显示彩色输出：
- 服务器（蓝色）：Fastify 服务器运行在端口 8544
- 客户端（绿色）：Next.js 开发服务器运行在端口 8543

### 5. 生产模式

用于生产环境部署：

```bash
npm run build
npm start
```

这将同时启动服务器和客户端进程。日志会以 `[server]` 和 `[client]` 前缀区分，便于识别。

**注意**：`npm start` 不提供进程守护功能。如果进程崩溃，不会自动重启。生产环境建议使用 systemd 或 Docker 等进程管理工具。

### 6. 使用 systemd 管理进程（Linux）

在 Linux 生产环境中，您可以使用 systemd 来管理 epress 节点：

**创建服务文件** `/etc/systemd/system/epress.service`：
```ini
[Unit]
Description=ePress Node
After=network.target

[Service]
Type=simple
User=epress
WorkingDirectory=/path/to/epress
ExecStart=/usr/bin/node commands/start.mjs
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**启用并启动服务**：
```bash
sudo systemctl enable epress
sudo systemctl start epress
```

**查看日志**：
```bash
sudo journalctl -u epress -f
```

### 7. 独立运行服务器/客户端

您也可以分别运行服务器和客户端：

**仅服务器**：
```bash
npm run start:server
```

**仅客户端**：
```bash
npm run start:client
```

### 8. 通过 Web 界面完成设置

服务器运行后，在浏览器中打开 `http://localhost:8543`。

您将被自动重定向到网页安装向导。该界面将引导您配置节点的应用设置（节点地址、个人资料、邮件服务器等）。这些设置将保存到数据库中。

### 9. 自定义基础设施配置 (可选)

项目包含一个带有标准基础设施设置的默认 `.env` 文件。如果您需要覆盖这些设置（例如，更改服务器端口或数据库文件路径），请在项目根目录中创建一个名为 `.env.local` 的新文件。

您在 `.env.local` 中定义的任何变量都将优先于 `.env` 中的变量。

**`.env.local` 示例**：
```
# .env.local
# 更改默认的客户端和服务器端口
EPRESS_CLIENT_PORT=8080
EPRESS_SERVER_PORT=8081
```

### 10. 使用不同的数据库（如 PostgreSQL）

默认情况下，epress 使用 SQLite 以便于设置。对于生产环境，您可以切换到更强大的数据库，如 PostgreSQL 或 MySQL。

1.  **安装数据库驱动**：
    安装所选数据库所需的驱动。例如，PostgreSQL：
    ```bash
    npm install pg
    ```

2.  **配置环境变量**：
    创建或编辑您的 `.env.local` 文件以设置数据库客户端和连接字符串。

    **PostgreSQL 示例**：
    ```
    # .env.local
    EPRESS_DATABASE_CLIENT=pg
    EPRESS_DATABASE_CONNECTION=postgres://user:password@host:port/database
    ```

    - `EPRESS_DATABASE_CLIENT`：设置为您的数据库的 knex 客户端（PostgreSQL 为 `pg`，MySQL 为 `mysql` 等）。
    - `EPRESS_DATABASE_CONNECTION`：数据库的连接字符串。

---

## 反向代理模式（Caddy/Nginx）

对于需要处理大文件上传的生产环境部署，您可以使用外部反向代理（Caddy 或 Nginx）代替 Next.js 的内置重写功能。这样可以消除文件上传的双重内存开销。

### 1. 启用反向代理模式

在 `.env.local` 中设置环境变量：
```
EPRESS_REVERSE_PROXY=true
```

### 2. 配置反向代理

**Caddy 示例**（`Caddyfile`）：
```
yourdomain.com {
    reverse_proxy /api/* localhost:8544
    reverse_proxy /ewp/* localhost:8544
    reverse_proxy /* localhost:8543
}
```

**Nginx 示例**：
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:8544;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_request_buffering off;  # 大文件上传必须
    }

    location /ewp/ {
        proxy_pass http://localhost:8544;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_request_buffering off;
    }

    location / {
        proxy_pass http://localhost:8543;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**注意**：`proxy_request_buffering off` 对于高效处理大文件上传至关重要。

---

## 前后端分离部署

对于高级部署场景，您可以在不同的服务器上分别运行前端和后端。

### 1. 后端服务器

在后端服务器上：
```bash
# .env
EPRESS_SERVER_PORT=8544

npm run start:server
```

### 2. 前端服务器

在前端服务器上：
```bash
# .env
EPRESS_API_URL=http://your-backend-server:8544
EPRESS_CLIENT_PORT=8543

npm run start:client
```

前端将通过 `EPRESS_API_URL` 连接到后端 API。

---

## 可选：使用 PM2（高级用户）

如果您偏好使用 PM2 进行进程管理，可以创建自己的 `ecosystem.config.cjs`：

```javascript
module.exports = {
  apps: [
    {
      name: 'epress-server',
      script: './commands/server.mjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'epress-client',
      script: 'node_modules/.bin/next',
      args: 'start -p 8543',
      cwd: './client',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        EPRESS_API_URL: 'http://localhost:8544'
      }
    }
  ]
}
```

然后运行：
```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
```

---

## 管理和升级您的节点（Docker）

### 节点管理

常用 Docker 命令：

- **查看节点状态**：
  ```bash
  docker ps
  ```
- **查看节点日志**：
  ```bash
  docker logs -f my-epress-node
  ```
- **停止节点**：
  ```bash
  docker stop my-epress-node
  ```
- **启动已停止的节点**：
  ```bash
  docker start my-epress-node
  ```
- **重启节点**：
  ```bash
  docker restart my-epress-node
  ```
- **删除容器（保留数据卷）**：
  ```bash
  docker rm my-epress-node
  ```
- **删除数据卷（谨慎操作，将删除所有节点数据）**：
  ```bash
  docker volume rm epress-data
  ```
- **进入容器内部（高级用户）**：
  ```bash
  docker exec -it my-epress-node sh
  ```

### 节点升级

**强烈建议在升级前备份您的数据卷。**

1.  **拉取最新镜像**
    从 Docker Hub 拉取最新版本的 epress 镜像。
    ```bash
    docker pull ghcr.io/epressworld/epress:latest
    ```

2.  **停止并移除当前容器**
    找到正在运行的容器名称或 ID，然后停止并移除它。此操作不会影响存储在 `epress-data` 数据卷中的数据。
    ```bash
    docker stop my-epress-node
    docker rm my-epress-node
    ```

3.  **使用新镜像重启节点**
    使用初次安装时的 `docker run` 命令启动一个新容器。Docker 会自动将现有的 `epress-data` 数据卷挂载到新容器上。
    ```bash
    docker run -d \
      -p 8543:8543 -p 8544:8544 \
      -v epress-data:/app/data \
      --restart unless-stopped \
      --name my-epress-node \
      ghcr.io/epressworld/epress:latest
    ```

4.  **运行数据库迁移（如果需要）**
    新容器运行后，执行数据库迁移命令以应用任何数据库结构更新。
    ```bash
    docker exec my-epress-node npm run migrate
    ```

现在您的节点已升级并运行最新版本。

### 从源码升级

如果您从源码运行，请按照以下步骤升级您的节点：

1.  **停止服务器**（前台运行时按 `Ctrl+C`）。
2.  **获取最新代码**：
    ```bash
    git pull
    ```
3.  **安装或更新依赖**：
    ```bash
    npm install
    ```
4.  **运行数据库迁移**：
    ```bash
    npm run migrate
    ```
5.  **构建并重启服务器**：
    ```bash
    npm run build
    npm start
    ```

### 故障排除

**Docker**：检查容器日志以获取诊断信息：
```bash
docker logs my-epress-node
```

**源码**：查看终端输出日志。如果使用 systemd：
```bash
sudo journalctl -u epress -f
```

---

## 何时选择自定义构建？

- **使用官方镜像**：适合快速部署或无需自定义的场景，免去构建步骤。
- **自定义构建**：适用于以下情况：
  - 需要前后端分离（配置 `EPRESS_API_URL`，分别运行 `start:server` 或 `start:client`）。
  - 使用外部反向代理（设置 `EPRESS_REVERSE_PROXY=true`）。
  - 需要修改源码或添加自定义功能。
  - 需要特定的环境变量或配置。
