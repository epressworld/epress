# Mail Configuration Guide

## Overview

ePress supports email-based comment authentication, which requires proper SMTP (Simple Mail Transfer Protocol) configuration. This guide will help you set up email functionality for your ePress node.

## Why Configure Email?

Email configuration enables:
- **Email-based comment authentication**: Visitors can leave comments using their email addresses
- **Comment verification**: Automatic email verification for comment submissions
- **Comment deletion requests**: Users can request comment deletion via email

**Note**: Email configuration is **optional**. If not configured, visitors can still comment using Ethereum wallet authentication.

## When to Configure

You can configure email settings:
1. **During installation**: In the installer's "Mail Server Settings" section
2. **After installation**: In the admin settings panel

## Configuration Steps

### Step 1: Obtain SMTP Credentials

You'll need SMTP credentials from an email service provider. Common options include:

#### Gmail
1. Enable 2-factor authentication on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use format: `smtp://your-email@gmail.com:app-password@smtp.gmail.com:587`

#### Outlook/Hotmail
- Format: `smtp://your-email@outlook.com:password@smtp-mail.outlook.com:587`

#### Custom SMTP Server
- Format: `smtp://username:password@smtp.example.com:port`
- Use `smtps://` for SSL/TLS connections (usually port 465)

### Step 2: Configure in ePress

#### During Installation

1. Navigate to the "Mail Server Settings" section
2. Enter your SMTP configuration string in the "Mail Transport" field
3. Wait for automatic validation (you'll see a green checkmark if valid)
4. Enter your sender email address in the "Mail From" field
5. Complete the installation

**Important**: Both fields must be filled together or left empty together.

#### In Settings Panel

1. Log in as admin
2. Navigate to Settings
3. Find the "Mail Server Settings" section
4. Update the "Mail Transport" and "Mail From" fields
5. Wait for validation
6. Save changes

### Step 3: Verify Configuration

The system automatically validates your SMTP configuration:
- 🔄 **Validating**: Orange spinner appears while checking
- ✅ **Valid**: Green checkmark indicates successful validation
- ❌ **Invalid**: Red alert icon with error message

## Configuration Format

### Mail Transport String

The mail transport string follows this format:
```
protocol://username:password@host:port
```

**Components**:
- `protocol`: `smtp` (unencrypted/STARTTLS) or `smtps` (SSL/TLS)
- `username`: Your SMTP username (often your email address)
- `password`: Your SMTP password or app-specific password
- `host`: SMTP server hostname
- `port`: SMTP server port (common: 587 for SMTP, 465 for SMTPS)

**Examples**:
```
smtp://user@example.com:password123@smtp.example.com:587
smtps://user@gmail.com:app-password@smtp.gmail.com:465
```

### Mail From Address

The email address that will appear as the sender:
```
noreply@yourdomain.com
```

## Common SMTP Ports

- **Port 25**: Unencrypted (often blocked by ISPs)
- **Port 587**: STARTTLS (recommended for most providers)
- **Port 465**: SSL/TLS (secure, used by some providers)
- **Port 2525**: Alternative to port 587 (some providers)

## Troubleshooting

### Validation Fails

**Error**: "Invalid SMTP configuration"

**Solutions**:
1. Double-check username and password
2. Verify the SMTP server hostname
3. Ensure the port number is correct
4. Check if your email provider requires app-specific passwords
5. Verify your IP is not blocked by the SMTP server

### Gmail-Specific Issues

**Error**: "Invalid login"

**Solutions**:
1. Enable 2-factor authentication
2. Generate an App Password (don't use your account password)
3. Use the App Password in the configuration string

### Connection Timeout

**Error**: "Connection timeout"

**Solutions**:
1. Check your firewall settings
2. Verify the SMTP port is not blocked
3. Try using a different port (587 vs 465)
4. Contact your hosting provider about SMTP restrictions

## Security Best Practices

1. **Use App Passwords**: Never use your main email password
2. **Enable 2FA**: Always enable two-factor authentication
3. **Secure Storage**: SMTP credentials are stored securely in the database
4. **Regular Updates**: Change passwords periodically
5. **Monitor Usage**: Check for unusual email activity

## Testing Your Configuration

### Using Ethereal Email (Development)

For testing purposes, you can use [Ethereal Email](https://ethereal.email/):

1. Visit https://ethereal.email/create
2. Copy the SMTP credentials provided
3. Use format: `smtp://username:password@smtp.ethereal.email:587`
4. All emails will be captured and viewable on Ethereal's website

**Note**: Ethereal is for testing only. Use a real SMTP service in production.

## Disabling Email Authentication

If you want to disable email-based comments:

1. Go to Settings
2. Clear both "Mail Transport" and "Mail From" fields
3. Save changes

After disabling:
- Visitors can only use Ethereum wallet authentication
- A warning message will appear on the comment form
- Existing email-authenticated comments remain unaffected

## FAQ

### Q: Is email configuration required?
**A**: No, it's optional. Visitors can use Ethereum wallet authentication instead.

### Q: Can I change SMTP providers later?
**A**: Yes, update the settings anytime in the admin panel.

### Q: What happens to existing comments if I disable email?
**A**: Existing comments remain intact. Only new comment creation is affected.

### Q: Can I use a free email service?
**A**: Yes, but be aware of sending limits. Gmail allows ~500 emails/day for free accounts.

### Q: Is my SMTP password secure?
**A**: Yes, it's stored in the database and never exposed to clients.

### Q: Can I use multiple sender addresses?
**A**: No, only one "Mail From" address is supported per node.

## Advanced Configuration

### Custom SMTP Options

For advanced users, you can modify the SMTP transport string to include additional options:

```
smtp://user:pass@smtp.example.com:587?pool=true&maxConnections=5
```

Refer to [Nodemailer documentation](https://nodemailer.com/smtp/) for all available options.

### Using Environment Variables

For enhanced security, you can store SMTP credentials in environment variables:

1. Add to `.env.local`:
   ```
   SMTP_TRANSPORT=smtp://user:pass@smtp.example.com:587
   SMTP_FROM=noreply@example.com
   ```

2. Configure during installation or in settings using these values

## Support

If you encounter issues:
1. Check the [troubleshooting section](#troubleshooting)
2. Review server logs for detailed error messages
3. Join our [Telegram community](https://t.me/+mZMgNSIVy1MwMmVl)
4. Open an issue on [GitHub](https://github.com/epressworld/epress/issues)

## Related Documentation

- [Installation Guide](INSTALLATION.md)
- [Mail Configuration Enhancement (Technical)](../mail-configuration-enhancement.md)
- [Frontend Architecture](FRONTEND_ARCHITECTURE.md)

---

**Last Updated**: 2025-10-15  
**Version**: 1.0.0

