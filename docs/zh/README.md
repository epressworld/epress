<div align="center">
  <img src="/client/public/assets/logo-light.svg" alt="epress logo" width="200">
  <h1><strong>epress: 一个去中心化的内容与社交网络</strong></h1>
  <p text-align="center">构建一个人人自托管的完全去中心化内容和社交网络</p>
  <p>
    <a href="https://github.com/epressworld/epress/actions/workflows/main.yml"><img src="https://github.com/epressworld/epress/actions/workflows/main.yml/badge.svg" alt="GitHub Actions Main"></a>
    <a href="https://codecov.io/gh/epressworld/epress"><img src="https://codecov.io/gh/epressworld/epress/graph/badge.svg" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
    <a href="https://t.me/+mZMgNSIVy1MwMmVl"><img src="https://img.shields.io/badge/Telegram-Join%20Community-2CA5E0?logo=telegram&logoColor=white" alt="Telegram Community"></a>
  </p>
  <p align="center">
    <a href="/README.md">English</a> •
    <a href="/docs/zh/WHITEPAPER.md">白皮书</a> •
    <a href="https://youtu.be/BB1Zn3oFDVc">视频演示</a> •
    <a href="/docs/zh/SELF_HOSTING.md">安装说明</a>
  </p>
</div>

---

### epress 是什么？

`epress` 是一款用于构建真正去中心化内容和社交网络的开源软件与协议。它建立在一个简单而强大的理念之上：**你的节点，就是你的主权领土**。

在其他平台你只是“用户”，而在 epress，你是“所有者”。你运行着自己的 **节点（Node）**——一个通过密码学与你的**以太坊身份**绑定的自托管网站。`epress` 这个名字本身便源于 **E**thereum + **Press**，体现了它的技术之根与对“发布”的专注。

这个节点，就是你的数字家园：

*   **作为个人空间**，它是一个功能完备的博客和内容管理系统。
*   **作为社交实体**，它与其他节点连接，组成一个由你掌控规则的、有韧性的点对点网络。

## 为什么会有 epress？

市面上已经有很多社交产品，甚至也有了像 Mastodon 这样基于 ActivityPub 的去中心化联邦网络，为什么还要创造 epress？

这一切源于作者的一段亲身经历和一些不解的思考。

### 瞬间归零的十年记忆

2010年，我在新浪微博注册了一个账号，那正值我的青春期。十多年来，我在上面记录生活、建立社交、沉淀了无数珍贵的回忆。然而就在不久前，这个账号被无故封禁。没有理由，没有警告，没有解封的时间表。我多次申诉，得到的只有沉默。

那一刻我意识到，我们所谓的"数字资产"，在平台的规则面前是如此不堪一击。我们耗费心血创造的内容、建立的连接，其所有权从未真正属于我们。平台可以随时将它收回，让我们的一切归零。


### 为什么不再使用X(原Twitter)

不可否认 X 依然是当下社交网络的不二之选，但本质上其与新浪微博没有本质区别，随时面临同样的风险，另外还有另外一个原因，最近我想让AI帮我阅读我的时间线然后做一些有趣的事，但我发现仅仅是读取我自己的时间线，就需要每月支付不菲的API订阅费用，如果不支付这笔费用，几乎没有办法可靠稳定地读取我时间线上的内容（哪怕仅仅是我自己发布的内容），X也不提供除付费API以外的任何访问方式，即使我认为平台应该为每个在其平台上的用户提供基本的RSS输出功能。这就引申出了我的另一个思考，创作者们无偿创作的内容，其本意是无私分享，但平台却以此为壁垒向用户收取费用，这是否合理？

### 联邦制会是最终答案吗？

我也曾尝试过像Mastodon和Bluesky这样的联邦式社交网络。它们确实比传统中心化平台进了一步，但这并没有从根本上解决问题。我们只是从信任一个“大中心”（如 Twitter），变成了信任一个“小中心”（联邦实例的管理员）。这个“小中心”不仅掌握着审查和关停的权力，其不菲的运营成本也使其最终会面临商业化压力，让我们重新陷入与中心化平台类似的困境。我们的数据和身份，本质上依然托管于他人之手，我对其稳定性和可持续性持怀疑态度。

**epress 的诞生，就是为了回应这些问题。**

它追求的是一种更彻底的去中心化。在这里，**您的身份就是您的以太坊地址**，它不属于任何平台。**您的数据存储在您自己的节点上**，您拥有绝对的主权。连接是自由的，内容是属于您的，这是一个你真正可以从出生一直使用到老去的社交产品。

在epress之前，已经有很多去中心化社交网络方面的探索，包括此前提到的Mastodon，还有Nostr、Bluesky等优秀项目，它们都在不同程度上尝试解决中心化平台的问题。我不知道epress的方式是否是去中心化社交网络的最终形态，但我清楚这个模式下可以真正实现我对去中心化社交网络的所有想象，甚至还可能带来一些[超越想象的东西](/docs/zh/WHITEPAPER.md)，因此就有了你今天看到的epress。

如果你也认同这样的想法，欢迎加入我们一起构建一个真正的去中心化社交网络。

### 工作原理：核心原则

epress 通过几个关键的原创设计来实现彻底的去中心化，详情请参阅我们的[白皮书](/docs/zh/WHITEPAPER.md):

*   **自托管优先 (Self-Hosting First)**: epress 不依赖于联邦制或中继模型，而是回归互联网的本源。每个用户都托管自己的节点，确保了真正的数据所有权并消除了对第三方的信任。
*   **可验证内容 (Verifiable Content)**: 所有在网络上共享的内容，都通过密码学签名为“来源证明 (Proof of Source, PoS)”。这使得每一条信息都可追溯、防篡改且拥有唯一标识。
*   **点对点复制 (Peer-to-Peer Replication)**: 内容通过一个开放协议 (EWP) 在节点间直接流动。一种“通知-拉取 (Notify-Pull)”机制实现了高效且有韧性的内容分发，无需中心服务器。

---

🚀 **准备好深入了解了吗？**

*   **[通过 Docker 开始](#方式一-使用-docker-推荐)** — 启动您自己节点的最快方式。
*   **[阅读白皮书](/docs/zh/WHITEPAPER.md)** — 深入了解协议和其背后的哲学。
*   **[加入 Telegram 社群](https://t.me/+mZMgNSIVy1MwMmVl)** — 与社区建立连接。

---

### ✨ 核心特性

#### 📝 Web3个人发布平台（个人博客）

- **Web3 原生身份**: 使用以太坊地址作为身份，通过钱包签名（SIWE）登录管理
- **Markdown 写作**: 全功能 Markdown 语法支持，专注内容创作
- **多媒体发布**: 支持图片、视频、PDF 等任意文件类型，每个文件可附独立描述
- **个人品牌定制**: 自定义节点标题、简介、头像，打造独特身份
- **评论互动**: 支持邮件验证和钱包签名双重认证的评论系统
- **RSS Feed**: 将你发布的内容以RSS输出，现在任何人都可以通过他们喜欢的RSS阅读工具订阅你的更新 
- **节点设置**: 完全的节点管控权，包括关注权限、评论开关等

#### 🌐 完全去中心化的社交网络

- **节点连接**: 可以关注或被其他epress节点关注，创建社交连接
- **签名发布**: 对内容进行数字签名，签名后你的关注者将在他们的时间线看到你发布的内容
- **内容哈希**: 每份内容拥有全网唯一的 Content Hash 标识
- **个人时间线**: 就像所有社交网络一样，使用你的以太坊账号登录，查看所有你关注节点的更新
- **时间线RSS**: 使用授权你的Token可以用RSS形式访问你的社交网络时间线，现在你可以自由地让AI或者其他应用程序获取自己的时间线。

### 🛠️ 技术栈

*   **后端**: Swiftify (基于 Fastify, Objection.js)
*   **前端**: Next.js (React), Chakra UI
*   **数据库**: SQLite (默认)
*   **API**: GraphQL, RESTful (EWP)
*   **测试**: Ava.js

### 🚀 快速开始

我们提供两种方式来运行您自己的 `epress` 节点。

#### 方式一: 使用 Docker (推荐)

这是最简单、最快捷的部署方式，使用官方预构建的镜像 `ghcr.io/epressworld/epress`。

1. **启动节点**:
    ```bash
    docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node ghcr.io/epressworld/epress
    ```

2. **通过 Web 界面完成设置**:
    在浏览器中打开 `http://localhost:8543`。您将被自动重定向到安装向导，在这里您可以通过一个美观、友好的用户界面来配置您的节点。

更多 Docker 安装选项（例如前后端分离或自定义构建），请查阅 [**`docs/zh/SELF_HOSTING.md`**](/docs/zh/SELF_HOSTING.md)。

#### 方式二: 从源码运行

适合希望进行二次开发的开发者。

1. **克隆并安装依赖**:
    ```bash
    git clone https://github.com/epressworld/epress.git
    cd epress
    npm install
    ```

2. **构建项目**:
    ```bash
    npm run build
    ```

3. **启动节点**:
    ```bash
    npm run start
    ```

4. **通过 Web 界面完成设置**:
    在浏览器中打开 `http://localhost:8543`。您将被自动重定向到 `/install` 路径的安装向导，在这里配置您的节点。

    **注意**：项目现在包含一个默认的 `.env` 文件用于标准配置。如果您需要自定义基础设施设置（例如端口、数据库路径），请创建一个 `.env.local` 文件来覆盖默认值。如果您计划拉取未来的更新，请不要直接编辑 `.env` 文件。

更多详情请查阅 [**`docs/zh/INSTALLATION.md`**](/docs/zh/INSTALLATION.md)。

### 👨‍💻 开发者指南

如果您想参与 epress 的开发或基于 epress 进行二次开发：

1. **克隆代码库**:
   ```bash
   git clone https://github.com/epressworld/epress.git
   cd epress
   npm install
   ```

2. **启动开发环境**:
   启动服务器，它将使用默认的 `.env` 配置。
   ```bash
   npm run dev
   ```

3. **完成设置并开始开发**:
   打开 `http://localhost:8543/install` 以完成网页版设置。对于任何基础设施的自定义（如端口），请创建一个 `.env.local` 文件。开发服务器支持热重载。

3. **启动开发环境**:
   ```bash
   npm run dev
   ```
   这会启动前后端的开发服务器，支持热重载和实时调试。

4. **运行测试**:
   ```bash
   npm test
   ```

### 📁 项目结构

```
.
├── client/         # 前端 (Next.js)
├── commands/       # 核心命令行工具 (install, migrate, start)
├── docs/           # 项目设计与规范文档
├── server/         # 后端 (Swiftify, Fastify)
│   ├── graphql/    # GraphQL API 实现
│   ├── models/     # 数据库模型 (Objection.js)
│   └── routes/     # EWP RESTful API 实现
└── test/           # 测试用例 (Ava.js)
```

### 🤝 贡献

我们欢迎任何形式的贡献！请阅读我们的 [**`CONTRIBUTING.md`**](/CONTRIBUTING.md) 文件来了解如何参与项目开发。

## 👥 社区与生态

我们有一个活跃的社区，欢迎您加入我们或发现社区成员们构建的有趣内容。

*   **Awesome Nodes**: 一个由社区维护的 `epress` 网络节点列表。您可以在这里发现可靠、有趣的节点并与之连接。
    *   仓库地址: [https://github.com/epressworld/awesome-nodes](https://github.com/epressworld/awesome-nodes)
*   **Telegram**: 加入我们的 Telegram 群组，参与实时讨论。
    *   入群链接: [https://t.me/+mZMgNSIVy1MwMmVl](https://t.me/+mZMgNSIVy1MwMmVl)

### 📄 许可证

本项目基于 [MIT License](/LICENSE) 开源。