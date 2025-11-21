# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of Secure Chat Web seriously. If you discover a security vulnerability, please follow these steps:

### 🔒 Private Disclosure

**DO NOT** create a public GitHub issue for security vulnerabilities. Instead:

1. **Email**: Send details to **ahmed.j.iq@gmail.com**
2. **Subject**: Use the prefix `[SECURITY]` in your email subject
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
   - Your contact information

### ⏱️ Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - **Critical**: 1-7 days
  - **High**: 7-14 days
  - **Medium**: 14-30 days
  - **Low**: 30-90 days

### 🎯 Scope

**In Scope:**
- End-to-end encryption implementation
- Authentication and authorization
- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Server-side request forgery (SSRF)
- Remote code execution (RCE)
- Privilege escalation
- Information disclosure
- Session management issues
- Cryptographic vulnerabilities
- Dependency vulnerabilities

**Out of Scope:**
- Social engineering attacks
- Physical attacks
- Denial of service (DoS/DDoS)
- Rate limiting bypass (already implemented)
- Issues in third-party dependencies (report to maintainers)
- Issues requiring physical access to servers

### 🏆 Recognition

We appreciate security researchers who help keep Secure Chat Web safe:

- **Acknowledgment**: We'll credit you in our security advisories (unless you prefer to remain anonymous)
- **Hall of Fame**: Your name will be added to our SECURITY_HALL_OF_FAME.md file
- **Responsible Disclosure**: We follow coordinated disclosure practices

### 📋 Security Best Practices

When deploying Secure Chat Web:

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique values for `JWT_SECRET`
   - Rotate secrets regularly

2. **Database Security**
   - Use strong database passwords
   - Enable SSL/TLS for database connections
   - Restrict database access to application servers only
   - Regular backups with encryption

3. **Server Security**
   - Keep all dependencies up to date
   - Enable firewall (only ports 80, 443, 22)
   - Use SSL/TLS certificates (Let's Encrypt)
   - Enable rate limiting (already configured in Nginx)
   - Regular security updates for OS

4. **Application Security**
   - Enable E2EE for all conversations
   - Verify encryption keys with contacts
   - Use strong passwords (minimum 12 characters)
   - Enable 2FA for admin accounts
   - Regular security audits

5. **Monitoring**
   - Monitor application logs for suspicious activity
   - Set up alerts for failed login attempts
   - Track file upload patterns
   - Monitor database query performance

### 🔐 Security Features

Secure Chat Web includes:

- **End-to-End Encryption**: RSA-OAEP + AES-GCM
- **Password Hashing**: bcrypt with salt
- **JWT Authentication**: Secure session management
- **Rate Limiting**: 6 zones protecting different endpoints
- **Input Validation**: SQL injection prevention
- **XSS Protection**: React's built-in escaping
- **HTTPS/TLS**: Encrypted data in transit
- **Key Verification**: Prevent man-in-the-middle attacks
- **Audit Trail**: Complete activity logging

### 📚 Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [React Security Best Practices](https://react.dev/learn/security)

### 🔄 Security Updates

We use Dependabot to automatically monitor for:
- Dependency vulnerabilities
- Security patches
- Outdated packages

Pull requests are automatically created for security updates.

### ⚖️ Disclosure Policy

- We follow a **90-day disclosure timeline**
- Vulnerabilities are disclosed after a fix is released
- Critical vulnerabilities may be disclosed sooner if actively exploited
- We coordinate with affected parties before disclosure

### 📞 Contact

- **Security Email**: ahmed.j.iq@gmail.com
- **GitHub**: [@blackfoxxx](https://github.com/blackfoxxx)
- **Repository**: [blackfoxxx/securechat](https://github.com/blackfoxxx/securechat)

### 🙏 Thank You

Thank you for helping keep Secure Chat Web and our users safe!

---

**Last Updated**: November 21, 2025
