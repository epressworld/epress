<div align="center">
  <img src="/client/public/assets/logo-light.svg" alt="epress" width="140"><br><br>

  <strong>You don't own your social presence. You rent it.</strong><br><br>

  <p>epress is an open-source protocol and software for a decentralized social network<br>
  where each participant runs their own node — their sovereign digital home, for life.</p>

  <a href="https://github.com/epressworld/epress/actions/workflows/main.yml"><img src="https://github.com/epressworld/epress/actions/workflows/main.yml/badge.svg"></a>
  <a href="https://codecov.io/gh/epressworld/epress"><img src="https://codecov.io/gh/epressworld/epress/graph/badge.svg"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
  <a href="https://t.me/+mZMgNSIVy1MwMmVl"><img src="https://img.shields.io/badge/Telegram-Community-2CA5E0?logo=telegram"></a>

  <br><br>

  [Website](https://epress.world) · [Whitepaper](/docs/en/WHITEPAPER.md) · [Deploy Your Node](/docs/en/SELF_HOSTING.md) · [Demo](https://youtu.be/BB1Zn3oFDVc) · [中文](/docs/zh/README.md)

</div>

<br>

---

## Every social network you've ever used will eventually do this to you

In 2010, I built a decade of my life on Sina Weibo — memories, relationships, writing. One day, the account was banned without reason, warning, or appeal. A decade of digital life, gone overnight.

This isn't a Weibo story. It's how every platform works. **You are a tenant. Tenants get evicted.**

Twitter controls your API access. Instagram owns your graph. Mastodon instance admins hold your data. Even in "decentralized" networks, you're trusting someone else's infrastructure.

epress is a different answer: **don't trust anyone's infrastructure. Run your own.**

<br>

---

## Deploy your node in one command

```bash
docker run -d \
  -p 8543:8543 -p 8544:8544 \
  -v epress-data:/app/data \
  --name my-epress-node \
  ghcr.io/epressworld/epress
```

Open `http://localhost:8543`. Your node is live. **You now own a piece of the network.**

→ [Full self-hosting guide](/docs/en/SELF_HOSTING.md) &nbsp;·&nbsp; [Run from source](#run-from-source)

<br>

---

## The architecture: nodes all the way down

```
                    The epress Network

      ┌─────────────────────────────────────────────┐
      │                                             │
      │   alice.example.com      bob.example.com    │
      │   ┌──────────────┐      ┌──────────────┐   │
      │   │ Alice's Node │◄────►│  Bob's Node  │   │
      │   │              │      │              │   │
      │   │ • identity   │      │ • identity   │   │
      │   │ • content    │      │ • content    │   │
      │   │ • social     │      │ • social     │   │
      │   │   graph      │      │   graph      │   │
      │   └──────┬───────┘      └──────┬───────┘   │
      │          │                     │           │
      │          └──────────┬──────────┘           │
      │                     │                      │
      │              carol.net/node                │
      │              ┌──────────────┐              │
      │              │ Carol's Node │              │
      │              └──────────────┘              │
      │                                             │
      │  No central server. No platform. No admin. │
      └─────────────────────────────────────────────┘
```

Every node is a complete, independent social entity. Nodes talk to each other directly via the **epress World Protocol (EWP)** — an open peer-to-peer protocol anyone can implement.

There is no "epress server." The network *is* the nodes.

<br>

---

## Identity: your Ethereum address, nothing else

```
  Traditional social network          epress
  ───────────────────────────         ──────────────────────────────
  You → create account                You → generate Ethereum keypair
        │                                   │
        ▼                                   ▼
        Platform assigns you an ID          0x7a3f...c9d2  ← that's you
        │                                   │
        ▼                                   ▼
        Platform stores your data           Your node stores your data
        │                                   │
        ▼                                   ▼
        Platform can ban/delete you         Nobody can take this from you
        │
        ▼
        Platform shuts down → you lose everything
```

Your Ethereum address is your identity in epress. Controlled by your private key. No username, no password, no platform account. Authentication uses [Sign-In With Ethereum (EIP-4361)](https://eips.ethereum.org/EIPS/eip-4361) and [EIP-712](https://eips.ethereum.org/EIPS/eip-712) structured signatures — open standards, no vendor lock-in.

<br>

---

## Proof of Source: why this matters in the AI era

Every public post on epress is a **Proof of Source (PoS)**:

```
  You write a post
        │
        ▼
  ┌─────────────────────────────────────────────────┐
  │  Statement of Source (SoS)                      │
  │  ┌─────────────────────────────────────────┐   │
  │  │  contentHash:      SHA-256("your post") │   │
  │  │  publisherAddress: 0x7a3f...c9d2        │   │
  │  │  timestamp:        1735000000           │   │
  │  └─────────────────────────────────────────┘   │
  │                    +                           │
  │  signature: sign(SoS, your_private_key)        │
  └─────────────────────────────────────────────────┘
        │
        ▼
  Anyone can verify in seconds:
  ✓ This address published this exact content
  ✓ At this exact timestamp
  ✓ Nothing has been modified since
```

**Why this matters now:** AI can generate infinite content at zero cost. Within years, most text on the internet will be machine-generated. Without source proof, no one will know what to trust.

PoS provides cryptographic proof of human authorship. People don't give their private keys to bots — Ethereum addresses have real assets behind them. **That asymmetry is the signal.**

<br>

---

## Why epress for the AI Agent era

```
  Today's social networks:                epress:
  ──────────────────────────              ──────────────────────────
  Your AI Agent wants to                  Your AI Agent wants to
  read your feed                          read your feed
        │                                       │
        ▼                                       ▼
  "Pay $100/month for API access"         Open RSS feed — no auth
  "Sign our developer agreement"          Open API — no auth
  "You've hit the rate limit"             No rate limits
  "This content is not available"         All public content is public
        │                                       │
        ▼                                       ▼
  Your Agent can't function               Your Agent works perfectly
```

Every epress node exposes fully open RSS and API endpoints. No keys, no payment, no permission. Any AI agent — yours or anyone else's — can read the entire public network freely.

This isn't a feature. It's a design principle: **open is the only model that survives the Agent era.**

<br>

---

## How following works: a synchronous handshake

```
  Alice wants to follow Bob:

  Alice's Browser       Bob's Node           Alice's Node
        │                    │                    │
        ├─"I want to follow"─►│                    │
        │                    │                    │
        │◄─"Sign this" ───────┤                    │
        │                    │                    │
        ├─signed intent ──────►│                    │
        │                    │                    │
        │             ┌──────┴────────────────────┤
        │             │  sync confirm request      │
        │             ├───────────────────────────►│
        │             │                            │ verify signature
        │             │                            │ record "I follow Bob"
        │             │◄──── "confirmed" ──────────┤
        │             └──────┬────────────────────┘
        │                    │ only NOW record
        │                    │ "Alice follows me"
        │◄─"follow success" ──┤
        │
  Result: both nodes have the relationship, or neither does.
          No unilateral follows. No inconsistent state.
```

<br>

---

## How content flows: Notify-Pull

```
  Alice publishes a post:

  Alice's Node        Bob's Node        Carol's Node
       │                   │                  │
       │  1. generate PoS  │                  │
       │                   │                  │
       ├──PoS only (tiny)──►│                  │
       ├──PoS only (tiny)───────────────────► │
       │                   │                  │
       │                   │ 2. verify PoS    │ 2. verify PoS
       │                   │                  │
       │◄──"send content"───┤                  │
       │◄──"send content"────────────────────-┤
       │                   │                  │
       ├──full content ─────►│                  │
       ├──full content ──────────────────────► │
       │                   │                  │
       │            3. store replica   3. store replica

  Publisher sends only a lightweight PoS notification.
  Followers pull at their own pace.
  No bandwidth spike. Works even if followers are temporarily offline.
```

<br>

---

## One node. One lifetime.

This is the part people don't grasp immediately — and then can't stop thinking about.

```
  ──────────────────────────────────────────────────────────────────► time

  Birth          Childhood        Adulthood        Death        After
    │                │                │              │            │
    ▼                ▼                ▼              ▼            ▼
  Parents        Memories         Private key     Node still   Children
  deploy         recorded         transferred     runs.        inherit
  your node.     on your node.    to you.         Data intact. private key.


  Your Twitter:  deleted if you stop paying / platform acquired / policy change
  Your Mastodon: gone when your instance admin gives up
  Your epress:   yours. always. inheritable like property.
```

A parent can deploy a node for their newborn. Record childhood. Hand it over at adulthood. The owner carries it through life, then leaves it — intact, complete — to their children.

**A social presence you can write into your will.** That's new.

<br>

---

## vs. everything else

|                                   | Twitter/X | Mastodon | Nostr | Farcaster | **epress** |
|-----------------------------------|:---------:|:--------:|:-----:|:---------:|:----------:|
| You own your data                 | ✗ | △ | △ | △ | ✓ |
| Zero third-party infrastructure   | ✗ | ✗ | ✗ | ✗ | ✓ |
| Cryptographic content proof       | ✗ | ✗ | △ | △ | ✓ |
| Fully open API (no auth/payment)  | ✗ | △ | △ | △ | ✓ |
| Inheritable identity & data       | ✗ | ✗ | ✗ | ✗ | ✓ |
| No instance/relay dependency      | ✗ | ✗ | ✗ | ✗ | ✓ |

**Mastodon/Bluesky** shift trust from one big center to many small centers. Instance admins still hold your data and face commercialization pressure.

**Nostr** depends on relay operators for availability. Trust is distributed, not eliminated.

**Farcaster** puts identity on-chain (good) but social data in off-chain Hubs — still third-party infrastructure.

epress doesn't redistribute trust. It eliminates the need for it.

<br>

---

## Run from source

```bash
git clone https://github.com/epressworld/epress.git
cd epress
npm install
npm run build
npm install -g pm2    # PM2 is required for production
npm run start
# open http://localhost:8543
```

**For development:**

```bash
npm run dev   # hot reload, runs server + client in parallel
npm test
```

→ [Full self-hosting guide](/docs/en/SELF_HOSTING.md) &nbsp;·&nbsp; [Contributing](/CONTRIBUTING.md)

<br>

---

## Tech stack

| | |
|---|---|
| **Backend** | Node.js · Fastify · Objection.js |
| **Frontend** | Next.js · React · Chakra UI |
| **Database** | SQLite |
| **Protocol** | EWP (RESTful) · GraphQL |
| **Identity** | Ethereum · SIWE (EIP-4361) · EIP-712 |
| **Tests** | Ava.js |

<br>

---

## Read further

- **[Whitepaper](/docs/en/WHITEPAPER.md)** — full protocol spec, design philosophy, and the vision for a Value Internet built on epress
- **[epress.world](https://epress.world)** — website with visual explanations of every concept above
- **[Awesome Nodes](https://github.com/epressworld/awesome-nodes)** — live nodes in the network to follow and connect with
- **[Telegram](https://t.me/+mZMgNSIVy1MwMmVl)** — community discussion and support

<br>

---

<div align="center">

epress is early. The protocol is stable. The network is growing.

**If you think the direction is right — star the repo.**<br>
It's the highest-signal thing you can do right now.

<br>

MIT License · Built by [Garbin Huang](https://garbin.blog) and contributors

</div>