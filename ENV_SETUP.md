# Environment Configuration Guide

This guide explains how to configure environment variables for the Secure Chat application.

## Environment Variables Overview

The application requires several environment variables for proper operation. These are automatically configured when deployed on the Manus platform, but need manual setup for external hosting.

## Required Variables

### Database Configuration
- `DATABASE_URL` - MySQL/TiDB connection string
  - Format: `mysql://username:password@host:port/database?ssl=true`
  - Example: `mysql://chatuser:password@localhost:3306/secure_chat?ssl=true`

### Authentication & Security
- `JWT_SECRET` - Secret key for JWT tokens (minimum 32 characters)
  - Generate with: `openssl rand -base64 32`
- `ADMIN_USERNAME` - Admin dashboard username
- `ADMIN_PASSWORD` - Admin dashboard password

### Application Settings
- `VITE_APP_TITLE` - Application title (default: "Secure Chat Web")
- `VITE_APP_LOGO` - Path to logo file (default: "/logo.svg")
- `NODE_ENV` - Environment mode (`development` or `production`)
- `PORT` - Server port (default: 3000)

### Owner Information
- `OWNER_OPEN_ID` - OAuth identifier for the application owner
- `OWNER_NAME` - Name of the application owner

## Optional Variables

### OAuth Configuration (for Manus OAuth)
- `OAUTH_SERVER_URL` - OAuth server URL
- `VITE_OAUTH_PORTAL_URL` - OAuth portal URL for frontend
- `VITE_APP_ID` - OAuth application ID

### API Integrations
- `BUILT_IN_FORGE_API_URL` - Manus Forge API URL for backend
- `BUILT_IN_FORGE_API_KEY` - API key for backend services
- `VITE_FRONTEND_FORGE_API_KEY` - API key for frontend services
- `VITE_FRONTEND_FORGE_API_URL` - Manus Forge API URL for frontend

### Analytics
- `VITE_ANALYTICS_ENDPOINT` - Analytics service endpoint
- `VITE_ANALYTICS_WEBSITE_ID` - Website ID for analytics

## Setup Instructions

### For Manus Platform Deployment

All environment variables are automatically configured. You can manage them through:
1. Open Management UI → Settings → Secrets
2. View, edit, or delete existing secrets
3. For new secrets, use the secrets card in the chatbox

### For External Hosting

1. **Create .env file** in the project root:
```bash
touch .env
```

2. **Add required variables**:
```env
DATABASE_URL="mysql://user:password@host:3306/database?ssl=true"
JWT_SECRET="your-generated-secret-key"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="secure-password"
OWNER_OPEN_ID="your-owner-id"
OWNER_NAME="Your Name"
VITE_APP_TITLE="Secure Chat Web"
VITE_APP_LOGO="/logo.svg"
NODE_ENV="production"
PORT=3000
```

3. **Generate secure secrets**:
```bash
# Generate JWT secret
openssl rand -base64 32

# Generate admin password
openssl rand -base64 24
```

4. **Secure the .env file**:
```bash
chmod 600 .env
```

## Security Best Practices

1. **Never commit .env files** to version control
2. **Use strong passwords** for admin accounts (minimum 16 characters)
3. **Rotate secrets regularly** (JWT_SECRET, admin password)
4. **Use environment-specific values** (different secrets for dev/staging/prod)
5. **Store secrets securely** using tools like:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Doppler

## Production Checklist

Before deploying to production, ensure:

- [ ] All required environment variables are set
- [ ] JWT_SECRET is at least 32 characters and randomly generated
- [ ] Admin password is strong and unique
- [ ] DATABASE_URL uses SSL (`?ssl=true`)
- [ ] NODE_ENV is set to "production"
- [ ] .env file permissions are restricted (600)
- [ ] Secrets are not committed to version control
- [ ] Backup of environment variables exists in secure location

## Troubleshooting

### "Missing required environment variable" error
- Check that all required variables are set in .env
- Verify .env file is in the project root directory
- Restart the application after changing .env

### Database connection errors
- Verify DATABASE_URL format is correct
- Check database server is running and accessible
- Ensure database user has proper permissions
- Verify SSL certificate if using SSL

### OAuth errors
- Ensure OAUTH_SERVER_URL and related variables are correct
- Verify VITE_APP_ID matches your OAuth application
- Check that OAuth redirect URLs are properly configured

## Getting Help

For more information, see:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [README.md](./README.md) - Project overview
- Management UI → Settings → Secrets (for Manus platform users)
