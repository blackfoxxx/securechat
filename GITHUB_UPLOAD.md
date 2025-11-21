# GitHub Upload Instructions

This guide will help you upload the Secure Chat Web project to your GitHub repository.

## Repository Details
- **GitHub Username**: blackfoxxx
- **Repository Name**: securechat
- **Visibility**: Public
- **Repository URL**: https://github.com/blackfoxxx/securechat

## Prerequisites

You need a GitHub Personal Access Token (PAT) with `repo` permissions.

### Creating a Personal Access Token

1. Go to GitHub Settings: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "Secure Chat Upload"
4. Select scopes:
   - ✅ `repo` (Full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

## Method 1: Automated Script (Recommended)

Run the provided upload script:

```bash
cd /home/ubuntu/secure-chat-web
chmod +x github-upload.sh
./github-upload.sh
```

The script will:
1. Prompt you for your GitHub Personal Access Token
2. Create the repository on GitHub
3. Add the remote
4. Push all code and history

## Method 2: Manual Steps

If you prefer to do it manually:

### Step 1: Create the Repository on GitHub

```bash
# You'll be prompted for your GitHub token
gh auth login

# Create the repository
gh repo create blackfoxxx/securechat --public --source=. --remote=github --push
```

### Step 2: Or Use Git Directly

If you already created the repository on GitHub.com:

```bash
cd /home/ubuntu/secure-chat-web

# Remove old remote (optional)
git remote remove origin

# Add your GitHub repository
git remote add origin https://github.com/blackfoxxx/securechat.git

# Push all branches and tags
git push -u origin main --tags

# If you need to force push (use with caution)
# git push -u origin main --force --tags
```

### Step 3: Verify Upload

Visit your repository:
https://github.com/blackfoxxx/securechat

## Method 3: Using Personal Access Token Directly

```bash
cd /home/ubuntu/secure-chat-web

# Set your token as environment variable (replace YOUR_TOKEN)
export GITHUB_TOKEN="your_personal_access_token_here"

# Create repository using API
curl -H "Authorization: token $GITHUB_TOKEN" \
     -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/user/repos \
     -d '{"name":"securechat","description":"A modern, secure chat application with end-to-end encryption, real-time messaging, and voice/video calls","private":false}'

# Add remote with token
git remote add github https://blackfoxxx:$GITHUB_TOKEN@github.com/blackfoxxx/securechat.git

# Push code
git push -u github main --tags

# Clean up (remove token from remote URL for security)
git remote set-url github https://github.com/blackfoxxx/securechat.git
```

## What Gets Uploaded

The repository includes:
- ✅ All source code (client + server)
- ✅ Database schema and migrations
- ✅ Docker and deployment configurations
- ✅ Installation scripts
- ✅ Documentation (README, guides)
- ✅ Complete Git history with all checkpoints

The `.gitignore` file ensures these are **NOT** uploaded:
- ❌ node_modules/
- ❌ .env files (secrets)
- ❌ Database files
- ❌ SSL certificates
- ❌ Uploaded files
- ❌ Build artifacts

## After Upload

1. **Verify the upload**: Visit https://github.com/blackfoxxx/securechat
2. **Update README**: Edit README.md to replace placeholder URLs
3. **Add topics**: Add relevant topics (tags) to your repository
4. **Create releases**: Tag versions for releases
5. **Enable GitHub Pages** (optional): For documentation
6. **Set up CI/CD** (optional): Add GitHub Actions workflows

## Troubleshooting

### Authentication Failed
- Make sure your PAT has `repo` scope
- Check if the token is still valid
- Try creating a new token

### Repository Already Exists
If the repository name is taken:
```bash
# Delete the repository first (careful!)
gh repo delete blackfoxxx/securechat --yes

# Or choose a different name
```

### Push Rejected
If you get "push rejected" errors:
```bash
# Pull first if there are remote changes
git pull origin main --rebase

# Then push
git push origin main
```

### Large Files
If you have files over 100MB:
```bash
# Check for large files
find . -type f -size +50M

# Consider using Git LFS for large files
git lfs install
git lfs track "*.mp4"
git lfs track "*.zip"
```

## Security Notes

⚠️ **Important**: Never commit sensitive information:
- Environment variables (.env files)
- API keys or tokens
- Database credentials
- SSL certificates
- User data

The `.gitignore` file is configured to prevent this, but always double-check before pushing.

## Need Help?

- GitHub Docs: https://docs.github.com
- Git Docs: https://git-scm.com/doc
- Create an issue if you encounter problems

---

**Ready to upload?** Run the script or follow the manual steps above!
