# ePress 前端架构与组件化原则

> 版本: 1.0.0  
> 最后更新: 2025-10-14  
> 适用于: Next.js 15 + React 19

## 📖 目录

- [核心原则](#核心原则)
- [目录结构规范](#目录结构规范)
- [组件分类体系](#组件分类体系)
- [命名约定](#命名约定)
- [组件设计原则](#组件设计原则)
- [数据流管理](#数据流管理)
- [最佳实践](#最佳实践)

---

## 核心原则

### 1. 单一职责原则 (Single Responsibility Principle)
每个组件、Hook、Context 应该只有一个明确的职责。

**✅ 好的例子:**
```jsx
// UserAvatar.jsx - 只负责展示用户头像
function UserAvatar({ user, size = "md" }) {
  return (
    <Avatar.Root size={size}>
      <Avatar.Image src={user.avatarUrl} alt={user.name} />
      <Avatar.Fallback>{user.name?.[0]}</Avatar.Fallback>
    </Avatar.Root>
  )
}
```

**❌ 不好的例子:**
```jsx
// UserProfile.jsx - 职责过多:头像、信息、操作按钮、数据获取
function UserProfile({ userId }) {
  const [user, setUser] = useState(null)
  useEffect(() => { /* 数据获取 */ }, [])
  
  return (
    <div>
      <Avatar /> {/* 头像 */}
      <UserInfo /> {/* 信息 */}
      <FollowButton /> {/* 操作 */}
    </div>
  )
}
```

### 2. 组合优于继承 (Composition over Inheritance)
使用组合模式构建复杂组件,而不是深层继承。

### 3. 明确的服务端/客户端边界
- 默认使用服务端组件 (Server Components)
- 只在必要时使用 `"use client"` 指令
- 客户端组件应该尽可能小且专注

### 4. 可预测的数据流
- Props 向下流动
- 事件向上传递
- 使用 Context 共享全局状态
- 避免 prop drilling

### 5. 可复用性优先
- 识别重复的 UI 模式
- 提取为可配置的组件
- 提供清晰的 API

---

## 目录结构规范

```
client/
├── app/                          # Next.js App Router
│   ├── (routes)/                 # 路由组
│   │   ├── (main)/              # 主应用路由组
│   │   │   ├── publications/    # 发布页面
│   │   │   │   ├── page.jsx     # 服务端页面组件
│   │   │   │   └── [id]/        # 动态路由
│   │   │   │       └── page.jsx
│   │   │   └── layout.jsx       # 布局组件
│   │   └── (installer)/         # 安装器路由组
│   │       └── install/
│   │           └── page.jsx
│   └── api/                     # API 路由
│
├── components/                   # 组件目录
│   ├── ui/                      # 基础 UI 组件 (原子层)
│   │   ├── avatar/              # 头像组件族
│   │   │   ├── UserAvatar.jsx
│   │   │   └── NodeAvatar.jsx
│   │   ├── card/                # 卡片组件族
│   │   │   └── Card.jsx
│   │   ├── form/                # 表单组件族
│   │   │   ├── Input.jsx
│   │   │   ├── Textarea.jsx
│   │   │   └── FormField.jsx
│   │   └── index.js             # 统一导出
│   │
│   ├── features/                # 功能组件 (分子层)
│   │   ├── publication/         # 发布相关
│   │   │   ├── PublicationCard.jsx
│   │   │   ├── PublicationForm.jsx
│   │   │   ├── PublicationList.jsx
│   │   │   └── index.js
│   │   ├── comment/             # 评论相关
│   │   │   ├── CommentCard.jsx
│   │   │   ├── CommentForm.jsx
│   │   │   └── index.js
│   │   ├── connection/          # 连接/关注相关
│   │   │   ├── FollowButton.jsx
│   │   │   ├── FollowersList.jsx
│   │   │   └── index.js
│   │   └── node/                # 节点相关
│   │       ├── NodeCard.jsx
│   │       └── index.js
│   │
│   ├── layout/                  # 布局组件
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── Sidebar.jsx
│   │   └── PageLayout.jsx
│   │
│   └── providers/               # Provider 组件
│       ├── ApolloProvider.jsx
│       ├── WagmiProvider.jsx
│       └── ThemeProvider.jsx
│
├── hooks/                       # 自定义 Hooks
│   ├── data/                    # 数据获取 hooks
│   │   ├── usePublication.js
│   │   ├── useComment.js
│   │   └── useNode.js
│   ├── form/                    # 表单相关 hooks
│   │   ├── usePublicationForm.js
│   │   └── useCommentForm.js
│   ├── ui/                      # UI 相关 hooks
│   │   ├── useModal.js
│   │   └── useToast.js
│   └── utils/                   # 工具 hooks
│       ├── useIntl.js
│       └── usePageTitle.js
│
├── contexts/                    # React Contexts
│   ├── AuthContext.jsx
│   ├── PageContext.jsx
│   └── ThemeContext.jsx
│
├── lib/                         # 第三方库配置
│   ├── apollo/
│   │   ├── client.js
│   │   └── queries.js
│   └── wagmi/
│       └── config.js
│
├── utils/                       # 工具函数
│   ├── format/                  # 格式化工具
│   │   ├── date.js
│   │   └── text.js
│   ├── validation/              # 验证工具
│   │   └── form.js
│   └── helpers/                 # 辅助函数
│       └── url.js
│
├── styles/                      # 样式文件
│   └── globals.css
│
└── types/                       # TypeScript 类型定义 (未来)
    └── index.d.ts
```

---

## 组件分类体系

### 1. UI 组件 (Atomic Components)
**位置:** `components/ui/`  
**职责:** 最基础的、无业务逻辑的 UI 元素  
**特点:**
- 高度可复用
- 无状态或只有 UI 状态
- 不依赖业务逻辑
- 通过 props 完全可配置

**示例:**
```jsx
// components/ui/avatar/UserAvatar.jsx
export function UserAvatar({ 
  user, 
  size = "md", 
  showStatus = false,
  onClick 
}) {
  return (
    <Avatar.Root size={size} onClick={onClick}>
      <Avatar.Image 
        src={user?.avatarUrl} 
        alt={user?.name || "User"} 
      />
      <Avatar.Fallback>
        {user?.name?.[0] || "?"}
      </Avatar.Fallback>
      {showStatus && <StatusIndicator status={user?.status} />}
    </Avatar.Root>
  )
}
```

### 2. 功能组件 (Feature Components)
**位置:** `components/features/`  
**职责:** 实现特定业务功能的组件  
**特点:**
- 包含业务逻辑
- 可能有复杂状态管理
- 组合多个 UI 组件
- 与数据层交互

**示例:**
```jsx
// components/features/publication/PublicationCard.jsx
export function PublicationCard({ 
  publication, 
  onEdit, 
  onDelete,
  showAuthor = true 
}) {
  const { t } = useIntl()
  const { isNodeOwner } = useAuth()
  
  return (
    <Card>
      {showAuthor && <NodeCard node={publication.author} />}
      <ContentDisplay content={publication.content} />
      <PublicationActions 
        publication={publication}
        onEdit={onEdit}
        onDelete={onDelete}
        canEdit={isNodeOwner}
      />
    </Card>
  )
}
```

### 3. 布局组件 (Layout Components)
**位置:** `components/layout/`  
**职责:** 定义页面结构和布局  
**特点:**
- 控制页面整体结构
- 管理响应式布局
- 提供插槽 (slots) 给子组件

### 4. Provider 组件
**位置:** `components/providers/`  
**职责:** 提供全局状态和配置  
**特点:**
- 包装第三方库
- 提供 Context
- 初始化全局配置

---

## 命名约定

### 组件命名
- **文件名:** PascalCase (如 `UserAvatar.jsx`)
- **组件名:** 与文件名一致
- **导出方式:** 命名导出 (Named Export)

```jsx
// ✅ 推荐
export function UserAvatar() { }

// ❌ 不推荐
export default function() { }
```

### Hook 命名
- **文件名:** camelCase,以 `use` 开头 (如 `usePublication.js`)
- **Hook 名:** 与文件名一致

```jsx
// usePublication.js
export function usePublication(id) {
  // ...
}
```

### Context 命名
- **文件名:** PascalCase + Context (如 `AuthContext.jsx`)
- **Context 名:** 与文件名一致
- **Hook 名:** `use` + 功能名 (如 `useAuth`)

```jsx
// AuthContext.jsx
const AuthContext = createContext()

export function AuthProvider({ children }) {
  // ...
}

export function useAuth() {
  return useContext(AuthContext)
}
```

---

## 组件设计原则

### 1. Props 设计
**原则:**
- 保持 props 简单明了
- 使用解构赋值
- 提供默认值
- 使用 TypeScript 或 PropTypes (未来)

**示例:**
```jsx
export function NodeCard({ 
  node,                    // 必需的数据对象
  size = "md",            // 可选,有默认值
  showDescription = true, // 布尔值,有默认值
  onFollow,               // 可选的回调函数
  className               // 可选的样式类
}) {
  // ...
}
```

### 2. 组件组合模式
使用组合模式而不是配置模式来构建灵活的组件。

**✅ 推荐 - 组合模式:**
```jsx
<PublicationCard>
  <PublicationCard.Header>
    <NodeCard node={author} />
  </PublicationCard.Header>
  <PublicationCard.Content>
    {content}
  </PublicationCard.Content>
  <PublicationCard.Footer>
    <LikeButton />
    <CommentButton />
  </PublicationCard.Footer>
</PublicationCard>
```

**❌ 不推荐 - 配置模式:**
```jsx
<PublicationCard
  showAuthor={true}
  showLikes={true}
  showComments={true}
  headerPosition="top"
  // 太多配置项...
/>
```

### 3. 状态提升
当多个组件需要共享状态时,将状态提升到最近的共同父组件。

### 4. 错误边界
为关键组件添加错误边界,防止整个应用崩溃。

---

## 数据流管理

### 1. 数据获取策略
- **服务端组件:** 直接在组件中 fetch 数据
- **客户端组件:** 使用 Apollo Client hooks
- **全局状态:** 使用 React Context
- **表单状态:** 使用 react-hook-form

### 2. Context 使用原则
**何时使用 Context:**
- 真正的全局状态 (主题、认证、语言)
- 深层组件树需要的数据
- 避免 prop drilling

**何时不使用 Context:**
- 可以通过 props 传递的数据
- 频繁变化的状态 (使用 state)
- 可以通过组合解决的问题

---

## 最佳实践

### 1. 服务端组件优先
默认使用服务端组件,只在需要时添加 `"use client"`。

**需要客户端组件的情况:**
- 使用 React hooks (useState, useEffect 等)
- 事件处理 (onClick, onChange 等)
- 浏览器 API (localStorage, window 等)
- 第三方客户端库

### 2. 避免过度组件化
不要为了组件化而组件化。

**何时创建新组件:**
- 代码重复出现 3 次以上
- 组件超过 200 行代码
- 有明确的复用场景
- 有独立的职责

**何时不创建新组件:**
- 只使用一次的代码
- 简单的 UI 片段 (<20 行)
- 紧密耦合的逻辑

### 3. 性能优化
- 使用 React.memo 避免不必要的重渲染
- 使用 useMemo 和 useCallback 优化计算和函数
- 懒加载大型组件
- 图片优化 (Next.js Image 组件)

### 4. 可访问性 (a11y)
- 使用语义化 HTML
- 添加 ARIA 属性
- 键盘导航支持
- 屏幕阅读器友好

### 5. 国际化 (i18n)
- 所有文本使用 `useIntl` hook
- 不要硬编码文本
- 考虑 RTL 语言支持

---

## 迁移指南

### 从旧架构迁移到新架构

1. **识别组件类型:** 确定组件属于 UI、Feature 还是 Layout
2. **移动到新位置:** 按照新的目录结构移动文件
3. **更新导入路径:** 修改所有 import 语句
4. **重构组件:** 按照新原则重构组件逻辑
5. **测试验证:** 确保功能正常

### 示例迁移

**旧结构:**
```
components/
  business/
    Publication/
      Item.jsx
```

**新结构:**
```
components/
  features/
    publication/
      PublicationCard.jsx
```

---

## 附录

### 推荐阅读
- [Next.js 15 文档](https://nextjs.org/docs)
- [React 19 文档](https://react.dev)
- [Atomic Design 方法论](https://bradfrost.com/blog/post/atomic-web-design/)

### 工具推荐
- ESLint + Biome (代码检查)
- Prettier (代码格式化)
- TypeScript (类型安全,未来)

---

**文档维护者:** ePress 开发团队  
**反馈渠道:** GitHub Issues

