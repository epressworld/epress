# 客户端默认语言配置

## 概述

通过环境变量 `EPRESS_CLIENT_LANGUAGE` 可以设置客户端的默认语言，解决页面初始加载时先显示英文再切换到中文的问题。

**重要变更**：语言设置已从服务器端移除，现在完全依赖环境变量和本地存储。

## 配置方法

### 1. 创建环境变量文件

在项目根目录创建 `.env` 文件：

```bash
# 客户端默认语言设置
# 可选值: en, zh
EPRESS_CLIENT_LANGUAGE=zh
```

### 2. 支持的语言代码

- `en`: 英文
- `zh`: 中文

### 3. 工作原理

1. **环境变量优先级**：环境变量 > localStorage
2. **初始化顺序**：
   - 首先读取环境变量 `EPRESS_CLIENT_LANGUAGE`
   - 如果没有设置，则使用 `en` 作为默认值
   - 页面加载时立即使用环境变量设置的语言
   - 用户可以通过界面切换语言，保存到 localStorage

### 4. 部署配置

#### 开发环境
在 `.env` 文件中设置：
```
EPRESS_CLIENT_LANGUAGE=zh
```

#### 生产环境
在服务器环境变量中设置：
```bash
export EPRESS_CLIENT_LANGUAGE=zh
```

或在 Docker 中：
```dockerfile
ENV EPRESS_CLIENT_LANGUAGE=zh
```

### 5. 注意事项

- 环境变量只影响初始加载时的默认语言
- 用户通过界面切换语言后，会保存到 localStorage（不再保存到服务器）
- 如果环境变量设置的语言代码无效，会回退到英文
- 修改环境变量后需要重启开发服务器
- 语言设置不再在设置界面中显示，完全通过环境变量控制

## 示例

### 设置为中文默认
```bash
EPRESS_CLIENT_LANGUAGE=zh
```

### 设置为英文默认
```bash
EPRESS_CLIENT_LANGUAGE=en
```

### 不设置（使用默认英文）
```bash
# 不设置该环境变量，或设置为空
# EPRESS_CLIENT_LANGUAGE=
```

## 技术实现

### 环境变量配置
在 `next.config.mjs` 中暴露环境变量：
```javascript
export default {
  env: {
    EPRESS_CLIENT_LANGUAGE: process.env.EPRESS_CLIENT_LANGUAGE,
  },
  // ... 其他配置
};
```

### 语言上下文
`LanguageContext` 现在完全依赖环境变量和 localStorage：
```javascript
const getDefaultLanguage = () => {
  return process.env.EPRESS_CLIENT_LANGUAGE || 'en';
};
```
