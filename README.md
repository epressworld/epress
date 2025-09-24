<div align="center">
  <img src="/client/public/assets/logo-light.svg" alt="epress logo" width="200">
  <h1><strong>epress: A Decentralized Content and Social Network</strong></h1>
  <p align="center">Building a fully decentralized content and social network, self-hosted by everyone.</p>
  <p>
    <a href="https://github.com/epressworld/epress/actions/workflows/main.yml"><img src="https://github.com/epressworld/epress/actions/workflows/main.yml/badge.svg" alt="GitHub Actions Main"></a>
    <a href="https://codecov.io/gh/epressworld/epress"><img src="https://codecov.io/gh/epressworld/epress/graph/badge.svg" /></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
    <a href="https://t.me/+mZMgNSIVy1MwMmVl"><img src="https://img.shields.io/badge/Telegram-Join%20Community-2CA5E0?logo=telegram&logoColor=white" alt="Telegram Community"></a>
  </p>
  <p align="center">
    <a href="/docs/zh/README.md">中文</a> •
    <a href="/docs/en/WHITEPAPER.md">White Paper</a> •
    <a href="https://youtu.be/BB1Zn3oFDVc">Video Demo</a> •
    <a href="/docs/en/INSTALLATION.md">Installation</a>
  </p>
</div>

---

### What is epress?

epress is an open-source software and protocol for a truly decentralized content and social network. It is built on a simple, powerful idea: **your node is your sovereign territory.**

Unlike platforms where you are a "user," in epress, you are an "owner." You run your own **Node**—a self-hosted website cryptographically tied to your **Ethereum identity**. The name `epress` itself derives from **E**thereum + **Press**, reflecting these technical roots and its focus on publishing.

This node is your digital homestead:

*   **As a personal space**, it's a fully-featured blog and content management system.
*   **As a social entity**, it connects to other nodes, forming a resilient, peer-to-peer network where you control the rules.

## Why epress?

With numerous social platforms available, including decentralized federated networks like Mastodon based on ActivityPub, why create epress? The answer stems from a personal experience and critical reflections.

### A Decade of Memories Erased Overnight

In 2010, I created a Sina Weibo account during my teenage years, documenting my life, building connections, and preserving countless memories over a decade. Recently, that account was banned without reason, warning, or appeal process. My attempts to recover it were met with silence.

That moment revealed how fragile our "digital assets" are under platform rules. The content we pour our hearts into and the connections we build are never truly ours—platforms can take them away, reducing everything to zero.

### Why Not Stick with X (Formerly Twitter)?

X remains a top social network, but it’s fundamentally no different from Sina Weibo, carrying the same risks. Additionally, I recently wanted an AI to analyze my timeline for fun, only to discover that accessing my own timeline programmatically requires an expensive monthly API subscription. Without it, there’s no reliable way to access even my own posts. X offers no alternatives like RSS feeds, which I believe should be a basic feature for all users. This led to another realization: creators share content altruistically, yet platforms monetize it by locking access behind paywalls. Is this fair?

### Will Federation Be the Final Answer?

I also tried federated social networks like Mastodon and Bluesky. They are indeed a step forward from traditional centralized platforms, but they don't solve the fundamental problem.

We merely shift our trust from a "big center" (like X) to a "smaller center" (the admin of a federated instance). This "small center" not only holds the power to censor or shut down, but its significant operational costs also create inevitable pressure to commercialize, leading back to the same dilemmas found on centralized platforms. Our data and identity are, in essence, still hosted in someone else's hands, and I am skeptical of its stability and sustainability.

**epress was born to address these problems.**

It pursues radical decentralization. Your identity is your Ethereum address, independent of any platform. Your data lives on your node, under your absolute control. Connections are free, and your content is yours—a social platform you can use from birth to old age.

Before epress, projects like Mastodon, Nostr, and Bluesky tackled centralized platform issues to varying degrees. I don’t claim epress is the ultimate decentralized social network, but it fulfills my vision for one and may even unlock [possibilities beyond imagination](/docs/en/WHITEPAPER.md). This is the epress you see today.

If you share this vision, join us in building a truly decentralized social network.

### How It Works: The Core Principles

epress achieves radical decentralization through a few key primitives, detailed in our [White Paper](/docs/en/WHITEPAPER.md):

*   **Self-Hosting First**: Instead of relying on a federated or relay-based model, epress returns to the internet's origins. Each user hosts their own node, ensuring true data ownership and eliminating third-party trust.
*   **Verifiable Content**: All content shared on the network is cryptographically signed as a "Proof of Source" (PoS). This makes every piece of information traceable, tamper-proof, and uniquely identifiable.
*   **Peer-to-Peer Replication**: Content flows directly between nodes via an open protocol (EWP). A "Notify-Pull" mechanism allows for efficient and resilient content distribution without central servers.

---

🚀 **Ready to dive in?**

*   **[Get Started with Docker](#option-1-docker-recommended)** — The fastest way to launch your own node.
*   **[Read the White Paper](/docs/en/WHITEPAPER.md)** — For a deep dive into the protocol and philosophy.
*   **[Join our Telegram](https://t.me/+mZMgNSIVy1MwMmVl)** — To connect with the community.

---

### ✨ Key Features

#### 📝 Web3 Personal Publishing Platform (Blog)

- **Web3-Native Identity**: Use your Ethereum address for identity, managed via Sign-In With Ethereum (SIWE).
- **Markdown Authoring**: Full Markdown support for distraction-free content creation.
- **Multimedia Publishing**: Upload images, videos, PDFs, and more, each with independent descriptions.
- **Personal Branding**: Customize your node’s title, bio, and avatar to reflect your unique identity.
- **Comment System**: Supports dual authentication via email or wallet signatures.
- **RSS Feed**: Share your content as an RSS feed, allowing anyone to subscribe via their preferred RSS reader.
- **Node Control**: Full control over your node, including follow permissions and comment settings.

#### 🌐 Fully Decentralized Social Network

- **Node Connections**: Follow or be followed by other epress nodes to create social links.
- **Signed Content**: Digitally sign your posts, which appear in your followers’ timelines.
- **Content Hashing**: Every piece of content has a unique, network-wide Content Hash identifier.
- **Personal Timeline**: Log in with your Ethereum account to view updates from all nodes you follow.
- **Timeline RSS**: Use an authenticated token to access your social network timeline via RSS, enabling AI or other apps to fetch your timeline freely.

### 🛠️ Tech Stack

* **Backend**: Swiftify (built on Fastify and Objection.js)
* **Frontend**: Next.js (React), Chakra UI
* **Database**: SQLite (default)
* **API**: GraphQL, RESTful (EWP)
* **Testing**: Ava.js

### 🚀 Get Started

Run your own `epress` node in two ways:

#### Option 1: Docker (Recommended)

The fastest and easiest deployment method, using the official pre-built image `ghcr.io/epressworld/epress`.

1. **Create a Data Volume**:
    ```bash
    docker volume create epress-data
    ```

2. **Run the Setup Wizard**:
    ```bash
    docker run -it --rm -v epress-data:/app/data ghcr.io/epressworld/epress install
    ```
    Follow the prompts to configure your node.

3. **Start Your Node**:
    ```bash
    docker run -d -p 8543:8543 -p 8544:8544 -v epress-data:/app/data --name my-epress-node ghcr.io/epressworld/epress
    ```

For advanced Docker options (e.g., separating frontend/backend or custom builds), see [**`docs/en/INSTALLATION.md`**](/docs/en/INSTALLATION.md).

#### Option 2: Run from Source

Ideal for developers who want to customize or contribute.

1. **Clone and Install Dependencies**:
    ```bash
    git clone https://github.com/epressworld/epress.git
    cd epress
    npm install
    ```

2. **Run the Setup Wizard**:
    ```bash
    node commands/install.mjs
    ```
    Follow the prompts to configure your node.

3. **Build the Project**:
    ```bash
    npm run build
    ```

4. **Start Your Node**:
    ```bash
    npm run start
    ```

For more details, see [**`docs/en/INSTALLATION.md`**](/docs/en/INSTALLATION.md).

### 👨‍💻 Developer Guide

To contribute to epress or build on top of it:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/epressworld/epress.git
   cd epress
   npm install
   ```

2. **Set Up Environment**:
   ```bash
   node commands/install.mjs
   ```
   Run this command to configure your node interactively, which also initializes the database. You can then further customize settings by editing the `.env` file. See `env.example` for all options.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   This launches the frontend and backend with hot reloading for real-time debugging.

4. **Run Tests**:
   ```bash
   npm test
   ```

### 📁 Project Structure

```
.
├── client/         # Frontend (Next.js)
├── commands/       # Core CLI tools (install, migrate, start)
├── docs/           # Design and specification docs
├── server/         # Backend (Swiftify, Fastify)
│   ├── graphql/    # GraphQL API implementation
│   ├── models/     # Database models (Objection.js)
│   └── routes/     # EWP RESTful API implementation
└── test/           # Test cases (Ava.js)
```

### 🤝 Contributing

We welcome contributions of all kinds! Please read our [**`CONTRIBUTING.md`**](/CONTRIBUTING.md) to learn how to get involved.

## 👥 Community & Ecosystem

*   **[Awesome Nodes](https://github.com/epressworld/awesome-nodes)**: A curated list of nodes in the `epress` network. The goal of this list is to provide a community-maintained resource for discovering reliable and interesting nodes to connect with.
*   **[Telegram Group](https://t.me/+mZMgNSIVy1MwMmVl)**: Join our community for real-time discussions and support.

### 📄 License

This project is licensed under the [MIT License](/LICENSE).