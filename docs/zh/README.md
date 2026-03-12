<div align="center">
  <img src="/client/public/assets/logo-light.svg" alt="epress" width="140"><br><br>

  <strong>你的社交存在不是拥有的，是租来的。</strong><br><br>

  <p>epress 是一个去中心化社交网络的开源协议与软件<br>
  每个参与者运行自己的节点——他们的数字主权家园，终身拥有。</p>

  <a href="https://github.com/epressworld/epress/actions/workflows/main.yml"><img src="https://github.com/epressworld/epress/actions/workflows/main.yml/badge.svg"></a>
  <a href="https://codecov.io/gh/epressworld/epress"><img src="https://codecov.io/gh/epressworld/epress/graph/badge.svg"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
  <a href="https://t.me/+mZMgNSIVy1MwMmVl"><img src="https://img.shields.io/badge/Telegram-Community-2CA5E0?logo=telegram"></a>

  <br><br>

  [网站](https://epress.world) · [白皮书](/docs/zh/WHITEPAPER.md) · [部署你的节点](/docs/zh/SELF_HOSTING.md) · [演示](https://youtu.be/BB1Zn3oFDVc) · [English](/README.md)

</div>

<br>

---

## 账号是租来的。节点是拥有的。

每个平台给你一个账号。epress 给你一个节点。
账号是租来的。节点是拥有的——属于你，终身拥有，可以像财产一样继承。
epress 给出了不同的答案：不要信任任何人的基础设施。运行你自己的。

<br>

---

## 一键部署你的节点

```bash
docker run -d \
  -p 8543:8543 -p 8544:8544 \
  -v epress-data:/app/data \
  --name my-epress-node \
  ghcr.io/epressworld/epress
```

打开 `http://localhost:8543`。你的节点已经上线。**你现在拥有网络的一部分。**

→ [完整自托管指南](/docs/zh/SELF_HOSTING.md) &nbsp;·&nbsp; [从源码运行](#从源码运行)

<br>

---

## 架构：节点到底层

```
                    epress 网络

      ┌─────────────────────────────────────────────┐
      │                                             │
      │   alice.example.com      bob.example.com    │
      │   ┌──────────────┐      ┌──────────────┐   │
      │   │ Alice 的节点 │◄────►│  Bob 的节点  │   │
      │   │              │      │              │   │
      │   │ • 身份       │      │ • 身份       │   │
      │   │ • 内容       │      │ • 内容       │   │
      │   │ • 社交       │      │ • 社交       │   │
      │   │   图谱       │      │   图谱       │   │
      │   └──────┬───────┘      └──────┬───────┘   │
      │          │                     │           │
      │          └──────────┬──────────┘           │
      │                     │                      │
      │              carol.net/node                │
      │              ┌──────────────┐              │
      │              │ Carol 的节点 │              │
      │              └──────────────┘              │
      │                                             │
      │  没有中心服务器。没有平台。没有管理员。    │
      └─────────────────────────────────────────────┘
```

每个节点都是一个完整、独立的社交实体。节点通过 **epress World Protocol (EWP)** 直接相互通信——一个任何人都可以实现的开放点对点协议。

没有"epress 服务器"。网络*就是*节点。

<br>

---

## 身份：你的以太坊地址，仅此而已

```
  传统社交网络              epress
  ─────────────────         ──────────────────────────────
  你 → 创建账号             你 → 生成以太坊密钥对
        │                         │
        ▼                         ▼
        平台分配给你一个ID         0x7a3f...c9d2  ← 这就是你
        │                         │
        ▼                         ▼
        平台存储你的数据           你的节点存储你的数据
        │                         │
        ▼                         ▼
        平台可以封禁/删除你        没有人能夺走这些
        │
        ▼
        平台关闭 → 你失去一切
```

你的以太坊地址就是你在 epress 中的身份。由你的私钥控制。没有用户名，没有密码，没有平台账号。认证使用 [Sign-In With Ethereum (EIP-4361)](https://eips.ethereum.org/EIPS/eip-4361) 和 [EIP-712](https://eips.ethereum.org/EIPS/eip-712) 结构化签名——开放标准，没有供应商锁定。

<br>

---

## 来源证明：为什么这在 AI 时代很重要

epress 上的每条公开帖子都是一个 **来源证明 (Proof of Source, PoS)**：

```
  你写了一篇帖子
        │
        ▼
  ┌─────────────────────────────────────────────────┐
  │  来源声明 (Statement of Source, SoS)            │
  │  ┌─────────────────────────────────────────┐   │
  │  │  contentHash:      SHA-256("你的帖子")   │   │
  │  │  publisherAddress: 0x7a3f...c9d2        │   │
  │  │  timestamp:        1735000000           │   │
  │  └─────────────────────────────────────────┘   │
  │                    +                           │
  │  signature: sign(SoS, 你的私钥)                 │
  └─────────────────────────────────────────────────┘
        │
        ▼
  任何人都可以在几秒钟内验证：
  ✓ 这个地址发布了这些确切的内容
  ✓ 在这个确切的时间戳
  ✓ 之后没有任何修改
```

**为什么现在这很重要：** AI 可以零成本生成无限内容。几年内，互联网上的大部分文本都将是机器生成的。没有来源证明，没人知道该相信什么。

PoS 提供人类作者身份的密码学证明。人们不会把私钥交给机器人——以太坊地址背后有真实的资产。**这种不对称性就是信号。**

<br>

---

## 为什么 epress 适合 AI Agent 时代

```
  今天的社交网络：                epress：
  ──────────────────────────      ──────────────────────────
  你的 AI Agent 想要              你的 AI Agent 想要
  读取你的动态                    读取你的动态
        │                               │
        ▼                               ▼
  "每月支付$100获取API访问"       打开 RSS feed——无需认证
  "签署我们的开发者协议"          打开 API——无需认证
  "你已达到速率限制"              没有速率限制
  "此内容不可用"                  所有公开内容都是公开的
        │                               │
        ▼                               ▼
  你的 Agent 无法工作             你的 Agent 完美运行
```

每个 epress 节点都暴露完全开放的 RSS 和 API 端点。没有密钥，没有付费，没有许可。任何 AI agent——你的或其他人的——都可以自由读取整个公开网络。

这不是一个功能。这是一个设计原则：**开放是唯一能在 Agent 时代生存的模式。**

<br>

---

## 关注如何工作：同步握手

```
  Alice 想要关注 Bob：

  Alice 的浏览器       Bob 的节点           Alice 的节点
        │                   │                    │
        ├─"我想要关注"──────►│                    │
        │                   │                    │
        │◄─"签名这个"────────┤                    │
        │                   │                    │
        ├─签名的意图─────────►│                    │
        │                   │                    │
        │            ┌──────┴────────────────────┤
        │            │  同步确认请求              │
        │            ├───────────────────────────►│
        │            │                            │ 验证签名
        │            │                            │ 记录"我关注了 Bob"
        │            │◄──── "已确认" ─────────────┤
        │            └──────┬────────────────────┘
        │                   │ 只有现在才记录
        │                   │ "Alice 关注了我"
        │◄─"关注成功"────────┤
        │
  结果：两个节点都有这段关系，或者都没有。
        没有单方面关注。没有不一致状态。
```

<br>

---

## 内容如何流动：通知-拉取

```
  Alice 发布一篇帖子：

  Alice 的节点        Bob 的节点        Carol 的节点
       │                   │                  │
       │  1. 生成 PoS      │                  │
       │                   │                  │
       ├──仅 PoS（很小）────►│                  │
       ├──仅 PoS（很小）─────────────────────► │
       │                   │                  │
       │                   │ 2. 验证 PoS      │ 2. 验证 PoS
       │                   │                  │
       │◄──"发送内容"───────┤                  │
       │◄──"发送内容"─────────────────────────┤
       │                   │                  │
       ├──完整内容──────────►│                  │
       ├──完整内容─────────────────────────────►│
       │                   │                  │
       │            3. 存储副本         3. 存储副本

  发布者只发送轻量级的 PoS 通知。
  关注者按自己的节奏拉取。
  没有带宽峰值。即使关注者暂时离线也能工作。
```

<br>

---

## 一个节点。一生。

这是人们不会立刻理解——但理解后就无法停止思考的部分。

```
  ──────────────────────────────────────────────────────────────────► 时间

  出生           童年           成年           死亡           之后
    │              │              │              │              │
    ▼              ▼              ▼              ▼              ▼
  父母         童年回忆        私钥转让        节点仍在        子女
  部署你的节点  记录在你的节点   交给你          运行。          继承私钥。
                                数据完整。


  你的 Twitter：  如果你停止付费/平台被收购/政策变化就会被删除
  你的 Mastodon： 当你的实例管理员放弃时就没了
  你的 epress：   你的。永远。可以像财产一样继承。
```

父母可以为新生儿部署一个节点。记录童年。成年时移交。所有者终身携带，然后——完整、完整地——留给子女。

**可以写入遗嘱的社交存在。** 这是全新的。

<br>

---

## 与其他平台的对比

|                                   | Twitter/X | Mastodon | Nostr | Farcaster | **epress** |
|-----------------------------------|:---------:|:--------:|:-----:|:---------:|:----------:|
| 你拥有你的数据                    | ✗ | △ | △ | △ | ✓ |
| 零第三方基础设施                  | ✗ | ✗ | ✗ | ✗ | ✓ |
| 密码学内容证明                    | ✗ | ✗ | △ | △ | ✓ |
| 完全开放的 API（无需认证/付费）   | ✗ | △ | △ | △ | ✓ |
| 可继承的身份和数据                | ✗ | ✗ | ✗ | ✗ | ✓ |
| 没有实例/中继依赖                 | ✗ | ✗ | ✗ | ✗ | ✓ |

**Mastodon/Bluesky** 将信任从一个大中心转移到许多小中心。实例管理员仍然掌握你的数据，并面临商业化压力。

**Nostr** 依赖中继运营者提供可用性。信任被分散，但没有消除。

**Farcaster** 将身份放在链上（好的），但社交数据放在链下的 Hubs——仍然是第三方基础设施。

epress 不是重新分配信任。它消除了对信任的需求。

<br>

---

## 从源码运行

```bash
git clone https://github.com/epressworld/epress.git
cd epress
npm install
npm run build
npm install -g pm2    # PM2 是生产环境必需的
npm run start
# 打开 http://localhost:8543
```

**开发模式：**

```bash
npm run dev   # 热重载，同时运行服务器和客户端
npm test
```

→ [完整自托管指南](/docs/zh/SELF_HOSTING.md) &nbsp;·&nbsp; [贡献指南](/CONTRIBUTING.md)

<br>

---

## 技术栈

| | |
|---|---|
| **后端** | Node.js · Fastify · Objection.js |
| **前端** | Next.js · React · Chakra UI |
| **数据库** | SQLite |
| **协议** | EWP (RESTful) · GraphQL |
| **身份** | Ethereum · SIWE (EIP-4361) · EIP-712 |
| **测试** | Ava.js |

<br>

---

## 延伸阅读

- **[白皮书](/docs/zh/WHITEPAPER.md)** — 完整的协议规范、设计哲学，以及基于 epress 构建价值互联网的愿景
- **[epress.world](https://epress.world)** — 网站，包含上述每个概念的视觉解释
- **[Awesome Nodes](https://github.com/epressworld/awesome-nodes)** — 网络中的活跃节点，可以关注和连接
- **[Telegram](https://t.me/+mZMgNSIVy1MwMmVl)** — 社区讨论和支持

<br>

---

<div align="center">

epress 还在早期。协议已经稳定。网络正在成长。

**如果你认为这个方向是对的——给仓库点个 star。**<br>
这是你现在能做的最高信号的事情。

<br>

MIT License · 由 [Garbin Huang](https://garbin.blog) 和贡献者构建

</div>
