# 客户端配置指南

## 概述

通过环境变量可以设置客户端的默认语言和主题，解决页面初始加载时先显示默认值再切换到用户设置的问题。

**重要变更**：语言和主题设置已从服务器端移除，现在完全依赖环境变量和本地存储。

## 配置方法

### 1. 创建环境变量文件

在项目根目录创建 `.env` 文件：

```bash
# 默认语言设置
# 可选值: en, zh
EPRESS_DEFAULT_LANGUAGE=zh

# 默认主题设置
# 可选值: light, dark, system
EPRESS_DEFAULT_THEME=light
```

### 2. 支持的语言代码

- `en`: 英文
- `zh`: 中文

### 3. 支持的主题代码

- `light`: 浅色主题
- `dark`: 深色主题
- `system`: 跟随系统主题

### 4. 工作原理

1. **localStorage 优先，环境变量作为默认值**：优先使用 localStorage 设置，环境变量作为初始默认值
2. **初始化顺序**：
   - 首先检查 localStorage 中是否有保存的语言和主题设置
   - 如果有 localStorage 设置，直接使用
   - 如果没有 localStorage 设置，使用环境变量作为默认值
   - 用户可以通过界面切换语言和主题，设置会保存到 localStorage
   - 环境变量只在首次访问时作为默认值使用

### 5. 部署配置

#### 开发环境
在 `.env` 文件中设置：
```
EPRESS_DEFAULT_LANGUAGE=zh
EPRESS_DEFAULT_THEME=dark
```

#### 生产环境
在服务器环境变量中设置：
```bash
export EPRESS_DEFAULT_LANGUAGE=zh
export EPRESS_DEFAULT_THEME=dark
```

或在 Docker 中：
```dockerfile
ENV EPRESS_DEFAULT_LANGUAGE=zh
ENV EPRESS_DEFAULT_THEME=dark
```

### 6. 注意事项

- localStorage 优先，环境变量作为默认值
- 用户通过界面切换语言和主题会保存到 localStorage，刷新页面后保持用户选择
- 如果环境变量设置的值无效，会回退到默认值
- 修改环境变量后需要重启开发服务器
- 语言和主题设置在"偏好设置" Tab 中显示，直接修改 localStorage
- 环境变量只在首次访问时作为默认值使用

## 示例

### 设置为中文 + 深色主题
```bash
EPRESS_DEFAULT_LANGUAGE=zh
EPRESS_DEFAULT_THEME=dark
```

### 设置为英文 + 浅色主题
```bash
EPRESS_DEFAULT_LANGUAGE=en
EPRESS_DEFAULT_THEME=light
```

### 设置为中文 + 跟随系统主题
```bash
EPRESS_DEFAULT_LANGUAGE=zh
EPRESS_DEFAULT_THEME=system
```

### 不设置（使用默认值）
```bash
# 不设置这些环境变量，将使用默认值
# EPRESS_DEFAULT_LANGUAGE=  # 默认: en
# EPRESS_DEFAULT_THEME=     # 默认: light
```

## 技术实现

### 环境变量配置
在 `next.config.mjs` 中暴露环境变量：
```javascript
export default {
  env: {
    EPRESS_DEFAULT_LANGUAGE: process.env.EPRESS_DEFAULT_LANGUAGE,
    EPRESS_DEFAULT_THEME: process.env.EPRESS_DEFAULT_THEME,
  },
  // ... 其他配置
};
```

### 语言上下文
`LanguageContext` 现在完全依赖环境变量和 localStorage：
```javascript
const getDefaultLanguage = () => {
  return process.env.EPRESS_DEFAULT_LANGUAGE || 'en';
};
```

### 主题上下文
`ThemeContext` 现在完全依赖环境变量和 localStorage：
```javascript
const getDefaultTheme = () => {
  return process.env.EPRESS_DEFAULT_THEME || 'light';
};
```

## 迁移指南

### 从服务器端设置迁移

1. **备份现有设置**：如果用户已有语言和主题设置，需要先备份
2. **设置环境变量**：根据用户偏好设置相应的环境变量
3. **清理服务器数据**：可以删除服务器端的语言和主题相关数据
4. **测试验证**：确保页面加载时直接显示正确的语言和主题

### 数据库清理

可以运行以下 SQL 清理不再需要的设置：
```sql
DELETE FROM settings WHERE key IN ('language', 'theme');
```
