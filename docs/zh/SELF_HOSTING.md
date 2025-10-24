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
docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node --restart=always ghcr.io/epressworld/epress:latest
```

- `-d`：后台运行容器。
- `-p 8543:8543` (前端) 和 `-p 8544:8544` (后端): 映射必要的容器端口到您的主机。
- `-v epress-data:/app/data`：挂载 `epress-data` 数据卷以持久化节点的数据库和配置。
- `--name my-epress-node`：为容器命名，便于管理。
- `--restart=always`: 确保节点在发生故障时自动重启。

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

---

## 管理和升级您的节点

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
    docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node --restart=always ghcr.io/epressworld/epress:latest
    ```

4.  **运行数据库迁移（如果需要）**
    新容器运行后，执行数据库迁移命令以应用任何数据库结构更新。
    ```bash
    docker exec my-epress-node npm run migrate
    ```

现在您的节点已升级并运行最新版本。

### 故障排除 (Docker)

检查容器日志以获取诊断信息：

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

### 4. 构建并启动节点

构建项目并启动服务器：

```bash
npm run build
npm run start
```

### 5. 通过 Web 界面完成设置

服务器运行后，在浏览器中打开 `http://localhost:8543`。

您将被自动重定向到网页安装向导。该界面将引导您配置节点的应用设置（节点地址、个人资料、邮件服务器等）。这些设置将保存到数据库中。

### 6. 自定义基础设施配置 (可选)

项目包含一个带有标准基础设施设置的默认 `.env` 文件。如果您需要覆盖这些设置（例如，更改服务器端口或数据库文件路径），请在项目根目录中创建一个名为 `.env.local` 的新文件。

您在 `.env.local` 中定义的任何变量都将优先于 `.env` 中的变量。

**`.env.local` 示例**：
```
# .env.local
# 更改默认的客户端和服务器端口
EPRESS_CLIENT_PORT=8080
EPRESS_SERVER_PORT=8081
```

### 7. 管理 epress 节点（源码）

- **停止节点**：在命令行窗口按 `Ctrl + C`。
- **修改配置**：基础设施设置可以在 `.env.local` 文件中更改（需要重启服务器）。应用设置可以在 epress 应用内部的设置面板中更新。

### 8. 从源码升级

如果您从源码运行，请按照以下步骤升级您的节点：

1.  **停止服务器**：在运行服务器的命令行窗口按 `Ctrl + C`。
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
    npm run start
    ```

### 9. 故障排除（源码）

检查命令行输出的日志信息以诊断问题。

---

## 何时选择自定义构建？

- **使用官方镜像**：适合快速部署或无需自定义的场景，免去构建步骤。
- **自定义构建**：适用于以下情况：
  - 需要前后端分离（配置 `EPRESS_API_URL`，分别运行 `start client` 或 `start server`）。
  - 需要修改源码或添加自定义功能。
  - 需要特定的环境变量或配置。
