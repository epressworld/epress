# 国际化使用说明

本项目已实现基于API的多语言切换功能，支持中文和英文。

## 功能特点

- 通过系统设置API控制语言切换
- 支持中文（zh）和英文（en）
- 语言设置保存在服务器端，同时本地缓存作为fallback
- 无需URL路由，通过API调用切换语言

## 使用方法

### 1. 在组件中使用翻译

```jsx
import { useTranslation } from '../hooks/useTranslation';

function MyComponent() {
  const { t, common, navigation } = useTranslation();
  
  return (
    <div>
      <h1>{navigation.home()}</h1>
      <button>{common.save()}</button>
      <p>{t('publication.publishSuccess')}</p>
    </div>
  );
}
```

### 2. 语言切换组件

```jsx
import { LanguageSwitcher } from '../components/common';

function Header() {
  return (
    <div>
      <LanguageSwitcher size="sm" />
    </div>
  );
}
```

### 3. 直接使用语言上下文

```jsx
import { useLanguage } from '../contexts/LanguageContext';

function MyComponent() {
  const { currentLanguage, switchLanguage, t } = useLanguage();
  
  return (
    <div>
      <p>当前语言: {currentLanguage}</p>
      <button onClick={() => switchLanguage('zh')}>切换到中文</button>
      <button onClick={() => switchLanguage('en')}>Switch to English</button>
    </div>
  );
}
```

## 添加新的翻译

### 1. 更新语言文件

在 `client/public/messages/` 目录下更新对应的语言文件：

**en.json:**
```json
{
  "mySection": {
    "myKey": "My English Text"
  }
}
```

**zh.json:**
```json
{
  "mySection": {
    "myKey": "我的中文文本"
  }
}
```

### 2. 在组件中使用

```jsx
const { t } = useTranslation();
return <p>{t('mySection.myKey')}</p>;
```

### 3. 带参数的翻译

**语言文件:**
```json
{
  "welcome": "Welcome, {name}!"
}
```

**组件中使用:**
```jsx
const { t } = useTranslation();
return <p>{t('welcome', { name: 'John' })}</p>;
```

## 技术实现

- 使用React Context管理语言状态
- 通过GraphQL API获取和更新语言设置
- 翻译数据内联在代码中，避免异步加载问题
- 支持参数替换的简单翻译函数
- 语言切换即时生效，无闪烁问题

## 注意事项

1. 语言设置会同步到服务器端
2. 如果API调用失败，会使用本地缓存
3. 默认语言为英文（en）
4. 翻译数据存储在 `client/utils/translations.js` 文件中
5. 添加新翻译需要同时更新中英文两个语言文件
