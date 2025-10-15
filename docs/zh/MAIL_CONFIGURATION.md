# 邮件配置指南

## 概述

ePress 支持基于电子邮件的评论认证,这需要正确配置 SMTP(简单邮件传输协议)。本指南将帮助您为 ePress 节点设置电子邮件功能。

## 为什么要配置邮件?

配置邮件功能可以启用:
- **基于邮箱的评论认证**: 访客可以使用电子邮件地址发表评论
- **评论验证**: 自动发送邮件验证评论提交
- **评论删除请求**: 用户可以通过邮件请求删除评论

**注意**: 邮件配置是**可选的**。如果未配置,访客仍然可以使用以太坊钱包认证发表评论。

## 何时配置

您可以在以下时机配置邮件设置:
1. **安装期间**: 在安装器的"邮件服务器设置"部分
2. **安装之后**: 在管理员设置面板中

## 配置步骤

### 步骤 1: 获取 SMTP 凭据

您需要从电子邮件服务提供商获取 SMTP 凭据。常见选项包括:

#### Gmail
1. 在您的 Google 账户上启用两步验证
2. 生成[应用专用密码](https://myaccount.google.com/apppasswords)
3. 使用格式: `smtp://your-email@gmail.com:app-password@smtp.gmail.com:587`

#### QQ 邮箱
1. 登录 QQ 邮箱,进入设置 -> 账户
2. 开启 SMTP 服务,获取授权码
3. 使用格式: `smtp://your-qq-number@qq.com:授权码@smtp.qq.com:587`

#### 163 邮箱
1. 登录 163 邮箱,进入设置 -> POP3/SMTP/IMAP
2. 开启 SMTP 服务,获取授权密码
3. 使用格式: `smtp://your-email@163.com:授权密码@smtp.163.com:465`

#### 自定义 SMTP 服务器
- 格式: `smtp://username:password@smtp.example.com:port`
- 使用 `smtps://` 进行 SSL/TLS 连接(通常是 465 端口)

### 步骤 2: 在 ePress 中配置

#### 安装期间

1. 导航到"邮件服务器设置"部分
2. 在"Mail Transport"字段中输入您的 SMTP 配置字符串
3. 等待自动验证(如果有效会显示绿色对勾)
4. 在"Mail From"字段中输入您的发件人邮箱地址
5. 完成安装

**重要**: 两个字段必须同时填写或同时留空。

#### 在设置面板中

1. 以管理员身份登录
2. 导航到设置
3. 找到"邮件服务器设置"部分
4. 更新"Mail Transport"和"Mail From"字段
5. 等待验证
6. 保存更改

### 步骤 3: 验证配置

系统会自动验证您的 SMTP 配置:
- 🔄 **验证中**: 显示橙色加载动画
- ✅ **有效**: 绿色对勾表示验证成功
- ❌ **无效**: 红色警告图标和错误消息

## 配置格式

### Mail Transport 字符串

邮件传输字符串遵循以下格式:
```
protocol://username:password@host:port
```

**组成部分**:
- `protocol`: `smtp`(未加密/STARTTLS)或 `smtps`(SSL/TLS)
- `username`: 您的 SMTP 用户名(通常是您的邮箱地址)
- `password`: 您的 SMTP 密码或应用专用密码
- `host`: SMTP 服务器主机名
- `port`: SMTP 服务器端口(常见: 587 用于 SMTP, 465 用于 SMTPS)

**示例**:
```
smtp://user@example.com:password123@smtp.example.com:587
smtps://user@gmail.com:app-password@smtp.gmail.com:465
smtp://123456789@qq.com:授权码@smtp.qq.com:587
```

### Mail From 地址

将显示为发件人的电子邮件地址:
```
noreply@yourdomain.com
```

## 常见 SMTP 端口

- **端口 25**: 未加密(通常被 ISP 阻止)
- **端口 587**: STARTTLS(大多数提供商推荐)
- **端口 465**: SSL/TLS(安全,某些提供商使用)
- **端口 2525**: 端口 587 的替代方案(某些提供商)

## 故障排除

### 验证失败

**错误**: "无效的 SMTP 配置"

**解决方案**:
1. 仔细检查用户名和密码
2. 验证 SMTP 服务器主机名
3. 确保端口号正确
4. 检查您的邮件提供商是否需要应用专用密码
5. 验证您的 IP 未被 SMTP 服务器阻止

### Gmail 特定问题

**错误**: "登录无效"

**解决方案**:
1. 启用两步验证
2. 生成应用专用密码(不要使用您的账户密码)
3. 在配置字符串中使用应用专用密码

### QQ 邮箱特定问题

**错误**: "535 Login Fail"

**解决方案**:
1. 确保已开启 SMTP 服务
2. 使用授权码而非 QQ 密码
3. 检查是否使用了正确的端口(587 或 465)

### 连接超时

**错误**: "连接超时"

**解决方案**:
1. 检查您的防火墙设置
2. 验证 SMTP 端口未被阻止
3. 尝试使用不同的端口(587 vs 465)
4. 联系您的托管服务提供商了解 SMTP 限制

## 安全最佳实践

1. **使用应用密码**: 永远不要使用您的主邮箱密码
2. **启用两步验证**: 始终启用两步验证
3. **安全存储**: SMTP 凭据安全存储在数据库中
4. **定期更新**: 定期更改密码
5. **监控使用**: 检查异常的邮件活动

## 测试您的配置

### 使用 Ethereal Email(开发环境)

用于测试目的,您可以使用 [Ethereal Email](https://ethereal.email/):

1. 访问 https://ethereal.email/create
2. 复制提供的 SMTP 凭据
3. 使用格式: `smtp://username:password@smtp.ethereal.email:587`
4. 所有邮件将被捕获并可在 Ethereal 网站上查看

**注意**: Ethereal 仅用于测试。在生产环境中使用真实的 SMTP 服务。

## 禁用邮件认证

如果您想禁用基于邮件的评论:

1. 进入设置
2. 清空"Mail Transport"和"Mail From"字段
3. 保存更改

禁用后:
- 访客只能使用以太坊钱包认证
- 评论表单上会显示警告消息
- 现有的邮件认证评论不受影响

## 常见问题

### 问: 邮件配置是必需的吗?
**答**: 不是,这是可选的。访客可以使用以太坊钱包认证。

### 问: 我可以稍后更改 SMTP 提供商吗?
**答**: 可以,随时在管理面板中更新设置。

### 问: 如果我禁用邮件,现有评论会怎样?
**答**: 现有评论保持不变。只影响新评论的创建。

### 问: 我可以使用免费邮件服务吗?
**答**: 可以,但要注意发送限制。Gmail 免费账户每天允许约 500 封邮件。

### 问: 我的 SMTP 密码安全吗?
**答**: 是的,它存储在数据库中,永远不会暴露给客户端。

### 问: 我可以使用多个发件人地址吗?
**答**: 不可以,每个节点只支持一个"Mail From"地址。

## 高级配置

### 自定义 SMTP 选项

对于高级用户,您可以修改 SMTP 传输字符串以包含其他选项:

```
smtp://user:pass@smtp.example.com:587?pool=true&maxConnections=5
```

有关所有可用选项,请参阅 [Nodemailer 文档](https://nodemailer.com/smtp/)。

### 使用环境变量

为了增强安全性,您可以将 SMTP 凭据存储在环境变量中:

1. 添加到 `.env.local`:
   ```
   SMTP_TRANSPORT=smtp://user:pass@smtp.example.com:587
   SMTP_FROM=noreply@example.com
   ```

2. 在安装或设置中使用这些值进行配置

## 国内邮箱服务商配置示例

### QQ 邮箱
```
smtp://123456789@qq.com:授权码@smtp.qq.com:587
```

### 163 邮箱
```
smtps://username@163.com:授权密码@smtp.163.com:465
```

### 126 邮箱
```
smtp://username@126.com:授权密码@smtp.126.com:25
```

### 新浪邮箱
```
smtp://username@sina.com:密码@smtp.sina.com:587
```

### 阿里云邮箱
```
smtps://username@aliyun.com:密码@smtp.aliyun.com:465
```

## 支持

如果您遇到问题:
1. 查看[故障排除部分](#故障排除)
2. 查看服务器日志以获取详细的错误消息
3. 加入我们的 [Telegram 社区](https://t.me/+mZMgNSIVy1MwMmVl)
4. 在 [GitHub](https://github.com/epressworld/epress/issues) 上提交问题

## 相关文档

- [安装指南](INSTALLATION.md)
- [邮件配置增强(技术文档)](../mail-configuration-enhancement.md)
- [前端架构](FRONTEND_ARCHITECTURE.md)

---

**最后更新**: 2025-10-15  
**版本**: 1.0.0

