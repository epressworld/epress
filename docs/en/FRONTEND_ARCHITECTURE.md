# ePress Frontend Architecture & Componentization Principles

> Version: 1.0.0  
> Last Updated: 2025-10-14  
> For: Next.js 15 + React 19

## 📖 Table of Contents

- [Core Principles](#core-principles)
- [Directory Structure](#directory-structure)
- [Component Classification](#component-classification)
- [Naming Conventions](#naming-conventions)
- [Component Design Principles](#component-design-principles)
- [Data Flow Management](#data-flow-management)
- [Best Practices](#best-practices)

---

## Core Principles

### 1. Single Responsibility Principle
Each component, Hook, and Context should have one clear responsibility.

**✅ Good Example:**
```jsx
// UserAvatar.jsx - Only responsible for displaying user avatar
function UserAvatar({ user, size = "md" }) {
  return (
    <Avatar.Root size={size}>
      <Avatar.Image src={user.avatarUrl} alt={user.name} />
      <Avatar.Fallback>{user.name?.[0]}</Avatar.Fallback>
    </Avatar.Root>
  )
}
```

**❌ Bad Example:**
```jsx
// UserProfile.jsx - Too many responsibilities: avatar, info, actions, data fetching
function UserProfile({ userId }) {
  const [user, setUser] = useState(null)
  useEffect(() => { /* data fetching */ }, [])
  
  return (
    <div>
      <Avatar /> {/* avatar */}
      <UserInfo /> {/* info */}
      <FollowButton /> {/* actions */}
    </div>
  )
}
```

### 2. Composition over Inheritance
Build complex components using composition patterns rather than deep inheritance.

### 3. Clear Server/Client Boundaries
- Use Server Components by default
- Only add `"use client"` when necessary
- Client Components should be small and focused

### 4. Predictable Data Flow
- Props flow down
- Events bubble up
- Use Context for global state
- Avoid prop drilling

### 5. Reusability First
- Identify repeated UI patterns
- Extract into configurable components
- Provide clear APIs

---

## Directory Structure

```
client/
├── app/                          # Next.js App Router
│   ├── (routes)/                 # Route groups
│   │   ├── (main)/              # Main app routes
│   │   │   ├── publications/    # Publications page
│   │   │   │   ├── page.jsx     # Server page component
│   │   │   │   └── [id]/        # Dynamic route
│   │   │   │       └── page.jsx
│   │   │   └── layout.jsx       # Layout component
│   │   └── (installer)/         # Installer routes
│   │       └── install/
│   │           └── page.jsx
│   └── api/                     # API routes
│
├── components/                   # Components directory
│   ├── ui/                      # Base UI components (Atomic layer)
│   │   ├── avatar/              # Avatar component family
│   │   │   ├── UserAvatar.jsx
│   │   │   └── NodeAvatar.jsx
│   │   ├── card/                # Card component family
│   │   │   └── Card.jsx
│   │   ├── form/                # Form component family
│   │   │   ├── Input.jsx
│   │   │   ├── Textarea.jsx
│   │   │   └── FormField.jsx
│   │   └── index.js             # Unified exports
│   │
│   ├── features/                # Feature components (Molecular layer)
│   │   ├── publication/         # Publication related
│   │   │   ├── PublicationCard.jsx
│   │   │   ├── PublicationForm.jsx
│   │   │   ├── PublicationList.jsx
│   │   │   └── index.js
│   │   ├── comment/             # Comment related
│   │   │   ├── CommentCard.jsx
│   │   │   ├── CommentForm.jsx
│   │   │   └── index.js
│   │   ├── connection/          # Connection/Follow related
│   │   │   ├── FollowButton.jsx
│   │   │   ├── FollowersList.jsx
│   │   │   └── index.js
│   │   └── node/                # Node related
│   │       ├── NodeCard.jsx
│   │       └── index.js
│   │
│   ├── layout/                  # Layout components
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── Sidebar.jsx
│   │   └── PageLayout.jsx
│   │
│   └── providers/               # Provider components
│       ├── ApolloProvider.jsx
│       ├── WagmiProvider.jsx
│       └── ThemeProvider.jsx
│
├── hooks/                       # Custom Hooks
│   ├── data/                    # Data fetching hooks
│   │   ├── usePublication.js
│   │   ├── useComment.js
│   │   └── useNode.js
│   ├── form/                    # Form related hooks
│   │   ├── usePublicationForm.js
│   │   └── useCommentForm.js
│   ├── ui/                      # UI related hooks
│   │   ├── useModal.js
│   │   └── useToast.js
│   └── utils/                   # Utility hooks
│       ├── useIntl.js
│       └── usePageTitle.js
│
├── contexts/                    # React Contexts
│   ├── AuthContext.jsx
│   ├── PageContext.jsx
│   └── ThemeContext.jsx
│
├── lib/                         # Third-party library configs
│   ├── apollo/
│   │   ├── client.js
│   │   └── queries.js
│   └── wagmi/
│       └── config.js
│
├── utils/                       # Utility functions
│   ├── format/                  # Formatting utilities
│   │   ├── date.js
│   │   └── text.js
│   ├── validation/              # Validation utilities
│   │   └── form.js
│   └── helpers/                 # Helper functions
│       └── url.js
│
├── styles/                      # Style files
│   └── globals.css
│
└── types/                       # TypeScript type definitions (future)
    └── index.d.ts
```

---

## Component Classification

### 1. UI Components (Atomic Components)
**Location:** `components/ui/`  
**Responsibility:** Most basic UI elements without business logic  
**Characteristics:**
- Highly reusable
- Stateless or only UI state
- No business logic dependencies
- Fully configurable via props

**Example:**
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

### 2. Feature Components
**Location:** `components/features/`  
**Responsibility:** Components implementing specific business features  
**Characteristics:**
- Contains business logic
- May have complex state management
- Composes multiple UI components
- Interacts with data layer

**Example:**
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

### 3. Layout Components
**Location:** `components/layout/`  
**Responsibility:** Define page structure and layout  
**Characteristics:**
- Controls overall page structure
- Manages responsive layout
- Provides slots for child components

### 4. Provider Components
**Location:** `components/providers/`  
**Responsibility:** Provide global state and configuration  
**Characteristics:**
- Wraps third-party libraries
- Provides Context
- Initializes global configuration

---

## Naming Conventions

### Component Naming
- **File name:** PascalCase (e.g., `UserAvatar.jsx`)
- **Component name:** Same as file name
- **Export style:** Named Export

```jsx
// ✅ Recommended
export function UserAvatar() { }

// ❌ Not recommended
export default function() { }
```

### Hook Naming
- **File name:** camelCase, starts with `use` (e.g., `usePublication.js`)
- **Hook name:** Same as file name

```jsx
// usePublication.js
export function usePublication(id) {
  // ...
}
```

### Context Naming
- **File name:** PascalCase + Context (e.g., `AuthContext.jsx`)
- **Context name:** Same as file name
- **Hook name:** `use` + feature name (e.g., `useAuth`)

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

## Component Design Principles

### 1. Props Design
**Principles:**
- Keep props simple and clear
- Use destructuring
- Provide default values
- Use TypeScript or PropTypes (future)

**Example:**
```jsx
export function NodeCard({ 
  node,                    // Required data object
  size = "md",            // Optional with default
  showDescription = true, // Boolean with default
  onFollow,               // Optional callback
  className               // Optional style class
}) {
  // ...
}
```

### 2. Component Composition Pattern
Use composition pattern instead of configuration pattern for flexible components.

**✅ Recommended - Composition:**
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

**❌ Not Recommended - Configuration:**
```jsx
<PublicationCard
  showAuthor={true}
  showLikes={true}
  showComments={true}
  headerPosition="top"
  // Too many config options...
/>
```

### 3. Lifting State Up
When multiple components need to share state, lift it to the nearest common parent.

### 4. Error Boundaries
Add error boundaries to critical components to prevent app crashes.

---

## Data Flow Management

### 1. Data Fetching Strategy
- **Server Components:** Fetch data directly in components
- **Client Components:** Use Apollo Client hooks
- **Global State:** Use React Context
- **Form State:** Use react-hook-form

### 2. Context Usage Principles
**When to use Context:**
- True global state (theme, auth, language)
- Data needed by deep component trees
- Avoid prop drilling

**When NOT to use Context:**
- Data that can be passed via props
- Frequently changing state (use state)
- Problems solvable by composition

---

## Best Practices

### 1. Server Components First
Use Server Components by default, only add `"use client"` when needed.

**When Client Components are needed:**
- Using React hooks (useState, useEffect, etc.)
- Event handlers (onClick, onChange, etc.)
- Browser APIs (localStorage, window, etc.)
- Third-party client libraries

### 2. Avoid Over-componentization
Don't componentize for the sake of componentization.

**When to create a new component:**
- Code repeats 3+ times
- Component exceeds 200 lines
- Clear reuse scenario
- Independent responsibility

**When NOT to create a new component:**
- Code used only once
- Simple UI fragments (<20 lines)
- Tightly coupled logic

### 3. Performance Optimization
- Use React.memo to avoid unnecessary re-renders
- Use useMemo and useCallback for optimization
- Lazy load large components
- Image optimization (Next.js Image component)

### 4. Accessibility (a11y)
- Use semantic HTML
- Add ARIA attributes
- Keyboard navigation support
- Screen reader friendly

### 5. Internationalization (i18n)
- All text uses `useIntl` hook
- No hardcoded text
- Consider RTL language support

---

## Migration Guide

### Migrating from Old to New Architecture

1. **Identify component type:** Determine if component is UI, Feature, or Layout
2. **Move to new location:** Move files according to new directory structure
3. **Update import paths:** Modify all import statements
4. **Refactor component:** Refactor logic according to new principles
5. **Test and verify:** Ensure functionality works

### Migration Example

**Old Structure:**
```
components/
  business/
    Publication/
      Item.jsx
```

**New Structure:**
```
components/
  features/
    publication/
      PublicationCard.jsx
```

---

## Appendix

### Recommended Reading
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [React 19 Documentation](https://react.dev)
- [Atomic Design Methodology](https://bradfrost.com/blog/post/atomic-web-design/)

### Recommended Tools
- ESLint + Biome (Code linting)
- Prettier (Code formatting)
- TypeScript (Type safety, future)

---

**Maintained by:** ePress Development Team  
**Feedback:** GitHub Issues

