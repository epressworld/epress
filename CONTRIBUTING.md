# epress 项目贡献指南

欢迎您为 epress 项目贡献代码！为了确保代码质量和项目一致性，请遵循以下指南。

## API 设计原则 (GraphQL)

在设计和实现 GraphQL API 时，请务必遵循以下核心原则：

### 1. 优先使用强类型 (Strongly-Typed)

*   **避免使用通用 `JSON` 类型**: 除非在极少数无法预先确定结构的情况下，否则请避免在 GraphQL Schema 中使用通用的 `JSON` 类型作为字段或输入。
*   **利用 GraphQL 的类型系统**: 充分利用 GraphQL 的强类型特性，为所有数据结构定义明确的 `type` 和 `input`。这能提供类型安全、增强可发现性，并支持客户端工具的自动代码生成。

### 2. 变更 (Mutations) 必须使用 `Input` 类型

*   **封装参数**: 对于所有变更 (Mutations)，请将输入参数封装在一个专门的 `Input` 类型中（例如 `CreateUser` 对应 `CreateUserInput`）。
*   **可选字段**: `Input` 类型中的字段应根据实际需求设置为可选 (Optional)，以便客户端可以灵活地只提供需要更新的字段。
*   **可扩展性**: 使用 `Input` 类型可以确保未来在不破坏现有客户端的情况下，轻松添加新的输入字段。

### 3. 追求语义的精确性 (Semantic Clarity)

*   **区分概念**: 即使两个类型在当前字段上看起来相同，如果它们代表的概念不同，也应定义独立的类型。
*   **示例**: 
    *   `Profile` 类型应专门用于表示**本节点**的公开资料，其字段应仅限于公开且直接展示的信息（例如 `ethereumAddress`, `url`, `title`, `description`），不包含内部 `id` 或时间戳等元数据。
    *   `Node` 类型则用于表示网络中的**任意一个节点**，特别是在处理关联关系（如关注列表、文章作者）时。
*   **避免歧义**: 通过精确的类型定义，消除 API 使用者对数据含义的猜测。

### 4. 统一命名约定 (Naming Conventions)

*   **字段名 (Field Names)**: 必须使用 **小驼峰命名法 (lower camelCase)**。
    *   **示例**: `allowFollow`, `clientSettings`, `someSecretKey`。
    *   **缩写**: 对于常用缩写（如 `RSS`, `URL`, `ID`），在小驼峰中保持其大写形式（例如 `enableRSS`）。
*   **类型名 (Type Names)**: 必须使用 **大驼峰命名法 (PascalCase)**（例如 `User`, `Publication`, `Settings`, `Profile`）。
*   **枚举值 (Enum Values)**: 必须使用 **全大写和下划线 (UPPER_CASE_SNAKE_CASE)**（例如 `POST`, `FILE`, `PENDING_VERIFICATION`）。

### 5. 考虑未来扩展性与安全性

*   **公共/私有数据分离**: 在设计类型时，始终考虑哪些数据是公开的，哪些是私有的。确保公共接口不会意外暴露敏感或内部数据。
*   **非破坏性变更**: 尽量设计能够向前兼容的 API，避免引入破坏性变更。

---

感谢您的贡献！请在提交代码前，确保您的设计和实现符合上述原则。