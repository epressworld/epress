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

#### 2.1 创建数据卷

创建一个 Docker 数据卷来持久化您的节点数据：

```bash
docker volume create epress-data
```

#### 2.2 首次安装与配置 (交互向导)

首次运行 `epress` 节点需要进行基本配置，例如数据库连接、节点地址等。通过运行一个一次性容器完成交互式配置：

```bash
docker run -it --rm -v epress-data:/app/data ghcr.io/epressworld/epress:latest install
```

- `-it`：启用交互模式以与向导交互。
- `--rm`：容器退出后自动删除。
- `-v epress-data:/app/data`：将名为 `epress-data` 的数据卷挂载到容器的 `/app/data` 目录，用于持久化配置和数据库。
- `install`：触发安装向导。

**您将看到一个交互式命令行向导，请根据提示输入以下信息**：

- **`EPRESS_AUTH_JWT_SECRET`**：用于加密用户身份验证令牌的密钥。建议按回车使用系统自动生成的安全密钥。
- **`EPRESS_NODE_ADDRESS`**：节点的以太坊地址，作为网络中的唯一身份，需为有效的 `0x` 开头地址。
- **`EPRESS_NODE_URL`**：节点的公开访问地址，需为 `http://` 或 `https://` 开头的有效 URL。
- **`EPRESS_MAIL_TRANSPORT`**：邮件发送服务配置，可留空（将禁用邮件功能）。

**配置说明**：

- 所有配置保存在 `epress-data` 数据卷中，确保数据持久化。
- 可通过环境变量预设配置，例如：
  ```bash
  docker run -it --rm -v epress-data:/app/data -e EPRESS_NODE_ADDRESS=0x... ghcr.io/epressworld/epress:latest install
  ```

#### 2.3 启动 epress 节点

配置完成后，启动 `epress` 节点：

```bash
docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node ghcr.io/epressworld/epress:latest
```

- `-d`：后台运行容器。
- `-p 8543:8543 -p 8544:8544`：将容器端口映射到主机端口。
- `-v epress-data:/app/data`：挂载数据卷以访问持久化配置。
- `--name my-epress-node`：为容器命名，便于管理。

节点启动后，可通过浏览器访问 `http://localhost:8543`（或配置中设置的客户端端口）。

### 3. 方法 2：自定义构建镜像

如果您有特殊需求（如前后端分离配置），需要克隆代码、修改配置并构建自定义 Docker 镜像。

#### 3.1 获取 epress 项目代码

克隆项目代码到本地：

```bash
git clone https://github.com/epressworld/epress.git
cd epress
```

#### 3.2 配置 .env 文件

在项目根目录下创建或编辑 `.env` 文件。完整的配置选项可在 `env.example` 文件中找到，包含所有可用的环境变量及其说明。示例配置：

```bash
EPRESS_AUTH_JWT_SECRET=your_jwt_secret
EPRESS_NODE_ADDRESS=0xYourNodeAddress
EPRESS_NODE_URL=http://your-node-url
EPRESS_API_URL=http://your-api-url  # 用于前后端分离
EPRESS_MAIL_TRANSPORT=your_mail_transport_config
```

- `EPRESS_API_URL`：在前后端分离场景下，设置为 API 服务器的地址（如 `http://localhost:8544`）。
- 其他配置项与交互向导中的说明一致（见方法 1 的配置说明）。

#### 3.3 构建 Docker 镜像

构建自定义 `epress` 镜像：

```bash
docker build -t my-epress-custom:latest .
```

- `-t my-epress-custom:latest`：为镜像指定名称和标签。
- `.`：表示 Dockerfile 位于当前目录。

#### 3.4 首次安装与配置

与方法 1 类似，创建一个数据卷并运行安装向导：

```bash
docker volume create epress-data
docker run -it --rm -v epress-data:/app/data my-epress-custom:latest install
```

如果 `.env` 文件中已预设配置，向导将跳过相应提问。

#### 3.5 启动 epress 节点（前后端分离）

**全栈运行**（默认，包含前端和 API 服务器）：

```bash
docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node my-epress-custom:latest
```

**仅运行 API 服务器**：

```bash
docker run -d -p 8544:8544 -v epress-data:/app/data --name my-epress-api my-epress-custom:latest start server
```

**仅运行前端应用程序**：

```bash
docker run -d -p 8543:8543 -v epress-data:/app/data --name my-epress-client my-epress-custom:latest start client
```

- `start server`：仅启动 API 服务器（端口 8544）。
- `start client`：仅启动前端应用程序（端口 8543）。
- 确保 `EPRESS_API_URL` 已配置为 API 服务器地址。

### 4. 管理 epress 节点（Docker）

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
- **删除数据卷（谨慎操作，删除所有节点数据）**：
  ```bash
  docker volume rm epress-data
  ```
- **进入容器内部（高级用户）**：
  ```bash
  docker exec -it my-epress-node sh
  ```

### 5. 故障排除（Docker）

检查容器日志以诊断问题：

```bash
docker logs my-epress-node
```

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

### 4. 首次安装与配置 (交互向导)

运行交互式配置脚本：

```bash
node commands/install.mjs
```

**交互向导提示**（与 Docker 安装的配置项一致）：

- **`EPRESS_AUTH_JWT_SECRET`**：身份验证密钥，建议使用自动生成。
- **`EPRESS_NODE_ADDRESS`**：以太坊地址（`0x` 开头）。
- **`EPRESS_NODE_URL`**：公开访问 URL（`http://` 或 `https://` 开头）。
- **`EPRESS_MAIL_TRANSPORT`**：邮件服务配置，可留空。

**配置说明**：

- 运行 `node commands/install.mjs` 将会在项目根目录创建并填充 `.env` 文件，这也会初始化数据库。
- 之后，您可以通过编辑 `.env` 文件进一步自定义设置。完整的配置选项可在 `env.example` 文件中找到，包含所有可用的环境变量及其说明。

### 5. 构建项目

在启动节点之前，需要构建项目以生成必要的文件：

```bash
npm run build
```

### 6. 启动 epress 节点

构建完成后，启动节点：

```bash
npm run start
```

节点启动后，可通过浏览器访问 `http://localhost:8543`（或配置的客户端端口）。

### 7. 管理 epress 节点（源码）

- **停止节点**：在命令行窗口按 `Ctrl + C`。
- **修改配置**：编辑 `.env` 文件后重新运行 `npm run build` 和 `npm run start`。
- **重新配置**：删除 `.env` 文件并运行：
  ```bash
  node commands/install.mjs
  ```
  或强制重新配置：
  ```bash
  node commands/install.mjs --force
  ```

### 8. 故障排除（源码）

检查命令行输出的日志信息以诊断问题。

---

## 何时选择自定义构建？

- **使用官方镜像**：适合快速部署或无需自定义的场景，免去构建步骤。
- **自定义构建**：适用于以下情况：
  - 需要前后端分离（配置 `EPRESS_API_URL`，分别运行 `start client` 或 `start server`）。
  - 需要修改源码或添加自定义功能。
  - 需要特定的环境变量或配置。