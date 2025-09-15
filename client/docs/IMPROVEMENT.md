# 前端认证与状态管理重构说明

**版本: 1.0**

**目的:** 本文档旨在详细阐述对 `epress` 前端认证和状态管理系统所做的重大重构。所有后续的开发（无论是人类还是AI）都应严格遵循本文档描述的设计模式和使用方法，以确保代码的清晰性、健壮性和可维护性。

---

### 1. 背景与问题

旧的认证逻辑存在以下核心问题：

*   **状态混乱**: 应用没有一个清晰、统一的用户状态定义。UI组件需要通过 `if/else` 组合 `isConnected`, `isAuthenticated`, `isNodeOwner` 等多个离散状态，逻辑复杂且容易出错。
*   **职责不清**: `useWallet` Hook 承担了过多的职责，既处理钱包连接，又管理应用登录（SIWE），导致其功能臃肿且难以理解。
*   **潜在Bug**: 点击钱包插件断开连接时，应用层无法正确同步登出状态，导致出现“幽灵登录”的UI Bug。
*   **数据分散**: 节点Profile信息在多个页面（如主页、详情页）被重复请求，缺乏统一的数据源。

### 2. 核心设计思想

为了解决上述问题，我们引入了三大核心设计原则：

#### 2.1. 统一状态机 (Unified State Machine)

我们摒弃了离散的状态判断，在 `AuthContext` 中建立了一个权威的、单一的状态机 `authStatus`。它明确定义了用户在应用中的所有可能状态：

*   `AUTH_STATUS.LOADING`: 初始加载中，正在检查本地Token或获取Profile。
*   `AUTH_STATUS.DISCONNECTED`: 钱包未连接。
*   `AUTH_STATUS.CONNECTED`: 钱包已连接，但未以节点所有者身份登录。
*   `AUTH_STATUS.AUTHENTICATED`: 钱包已连接，且已作为节点所有者登录。

**所有UI渲染和逻辑判断都应优先依赖此 `authStatus`。**

#### 2.2. 职责分离 (Separation of Concerns)

我们将核心逻辑拆分到两个职责单一的 Hooks 中：

*   **`useAuth`**: **应用认证 Hook**。
    *   **职责**: 管理上述 `authStatus` 状态机、存储JWT `token`、提供 `login()` 和 `logout()` 方法。
    *   **回答的问题**: “用户在*我们应用里*的状态是什么？”

*   **`useWallet`**: **钱包交互 Hook**。
    *   **职责**: 作为和 `wagmi` 库交互的唯一适配器，只负责处理与钱包的直接通信，如 `signEIP712Data()`。
    *   **回答的问题**: “我该如何*让用户的钱包*干活？”

#### 2.3. 中心化数据获取 (Centralized Data Fetching)

*   获取节点 `profile` 信息的逻辑已被**内置到 `AuthContext` 中**。
*   `AuthContext` 现在是 **`profile` 数据和认证状态的唯一真实来源**。
*   任何需要 `profile` 数据的组件，都应从 `useAuth` Hook 中获取，而不是自行请求。

---

### 3. 如何使用新的认证系统

以下是所有开发者在进行相关功能开发时必须遵循的使用方法：

#### 3.1. 获取认证状态和节点信息

```jsx
import { useAuth, AUTH_STATUS } from '../contexts/AuthContext';

function MyComponent() {
  const { 
    authStatus, 
    isNodeOwner, 
    profile, 
    profileLoading 
  } = useAuth();

  if (profileLoading) {
    return <p>Loading...</p>;
  }

  // 根据状态机渲染UI
  switch (authStatus) {
    case AUTH_STATUS.AUTHENTICATED:
      return <p>欢迎回来, {profile.title}!</p>;
    case AUTH_STATUS.CONNECTED:
      return <p>钱包已连接，但您不是所有者。</p>;
    case AUTH_STATUS.DISCONNECTED:
      return <p>请先连接钱包。</p>;
    default:
      return <p>正在加载...</p>;
  }
}
```

*   **判断是否登录**: 使用 `authStatus === AUTH_STATUS.AUTHENTICATED`。
*   **判断是否为所有者**: 直接使用从 `useAuth` 获取的 `isNodeOwner` 布尔值。
*   **获取Profile**: 直接使用从 `useAuth` 获取的 `profile` 对象。

#### 3.2. 执行登录 / 登出

```jsx
import { useAuth } from '../contexts/AuthContext';

function LoginButton() {
  const { login, logout, authStatus, AUTH_STATUS } = useAuth();

  if (authStatus === AUTH_STATUS.AUTHENTICATED) {
    return <button onClick={logout}>退出</button>;
  }

  if (authStatus === AUTH_STATUS.CONNECTED) {
    return <button onClick={login}>登录</button>;
  }

  return null; // 未连接钱包时不显示
}
```

*   **登录**: 调用 `login()` 方法，它会处理完整的SIWE流程。
*   **登出**: 调用 `logout()` 方法，它会清除Token并将会话状态降级为 `CONNECTED`。

#### 3.3. 执行钱包签名

当需要对 EIP-712 数据进行签名时，使用 `useWallet` Hook。

```jsx
import { useWallet } from '../hooks/useWallet';

async function signSomething() {
  const { signEIP712Data } = useWallet();
  
  const typedData = { /* ... EIP-712 data ... */ };
  
  try {
    const signature = await signEIP712Data(typedData);
    // ...后续操作
  } catch (error) {
    // ...错误处理
  }
}
```

---

### 4. 主要变更总结

*   **`client/contexts/AuthContext.jsx`**: 已被完全重构为新的状态机和数据中心。
*   **`client/hooks/useWallet.js`**: 已被简化，只保留钱包交互功能。
*   **`client/components/auth/WalletConnectButton.jsx`**: **已被删除**。
*   **`Header`, `HomePage`, `PublicationList`, `PublicationDetailPage`** 等组件均已完成改造，遵循上述新模式。

请所有开发者在后续工作中严格遵守此规范。
