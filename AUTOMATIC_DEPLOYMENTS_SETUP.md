# 🚀 Automatic Deployments Setup

## ✅ What I Just Created:

A GitHub Actions workflow at `.github/workflows/cloudflare-deploy.yml` that will **automatically deploy your app to Cloudflare Pages every time you push to `main`**.

---

## 🔑 Set Up GitHub Secrets (Required):

You need to add two secrets to your GitHub repository:

### 1. Go to GitHub Settings:

https://github.com/dannybuk-byte/DCIM/settings/secrets/actions

### 2. Click "New repository secret" and add:

#### Secret 1: `CLOUDFLARE_API_TOKEN`
1. **Name**: `CLOUDFLARE_API_TOKEN`
2. **Value**: Get from Cloudflare:
   - Go to: https://dash.cloudflare.com/profile/api-tokens
   - Click "Create Token"
   - Use template: "Edit Cloudflare Workers"
   - Or use the existing "dcim-dashboard build token" you saw earlier

#### Secret 2: `CLOUDFLARE_ACCOUNT_ID`
1. **Name**: `CLOUDFLARE_ACCOUNT_ID`
2. **Value**: Your Cloudflare Account ID:
   - Go to: https://dash.cloudflare.com/
   - Click on "dcim-dashboard" project
   - Look in the URL: `dash.cloudflare.com/YOUR_ACCOUNT_ID/...`
   - Or find it in Settings → General

---

## 📋 Step-by-Step Instructions:

### Step 1: Get Cloudflare API Token
1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Find the existing "dcim-dashboard build token" OR click "Create Token"
3. **Copy the token** (starts with something like `cloudflare_api_token_...`)

### Step 2: Get Cloudflare Account ID
1. Go to: https://dash.cloudflare.com/
2. Click on any project
3. **Copy the Account ID** from the URL (the long string after `/dash.cloudflare.com/`)
   - Example: `cd95268bbe64a081d47284ae8bc309c`

### Step 3: Add Secrets to GitHub
1. Go to: https://github.com/dannybuk-byte/DCIM/settings/secrets/actions
2. Click "New repository secret"
3. Add **CLOUDFLARE_API_TOKEN** with the token from Step 1
4. Click "Add secret"
5. Click "New repository secret" again
6. Add **CLOUDFLARE_ACCOUNT_ID** with the ID from Step 2
7. Click "Add secret"

### Step 4: Push the Workflow
```bash
cd "/Users/danielbuk/Desktop/DCIM"
git add .github/workflows/cloudflare-deploy.yml
git commit -m "feat: Add GitHub Actions for automatic Cloudflare deployments"
git push origin main
```

---

## ✨ How It Works:

1. **You push code** to `main` branch
2. **GitHub Actions automatically triggers**
3. **Builds your app** in the cloud
4. **Deploys to Cloudflare Pages**
5. **Your site updates** (2-3 minutes total)

---

## 🎯 What to Do Now:

1. **Go to GitHub**: https://github.com/dannybuk-byte/DCIM/settings/secrets/actions
2. **Add the two secrets** (see instructions above)
3. **Come back here** and I'll help you push the workflow
4. **Watch it deploy automatically!**

---

## 🔍 Finding Your Tokens:

- **API Token**: https://dash.cloudflare.com/profile/api-tokens
- **Account ID**: In the URL when you're in Cloudflare dashboard

Once you add the secrets, **every push to main will automatically deploy!** 🚀

