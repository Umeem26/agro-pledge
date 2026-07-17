# 🚀 Vercel Production Deployment Guide

This guide provides instructions to deploy the **AgroPledge** Web Dashboard to production using **Vercel**.

---

## ⚡ Zero-Config Deployment (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy the Project**:
   Run the deploy command from the project root directory:
   ```bash
   vercel
   ```
   Follow the CLI prompts:
   - **Link to existing project?** No
   - **Project Name**: `agro-pledge`
   - **Directory**: `./`
   - **Override settings?** No (the workspace includes a configured `vercel.json` file)

3. **Deploy to Production**:
   Once you verify the preview deployment, push it live:
   ```bash
   vercel --prod
   ```

---

## 🛠️ GitHub Integration Deployment

For automated CI/CD deployments:

1. Push your local workspace branch to GitHub:
   ```bash
   git push origin main
   ```
2. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
3. Click **Add New** > **Project**.
4. Import your `agro-pledge` repository.
5. In the project settings, make sure:
   - **Framework Preset**: Other / None (Static Site).
   - **Build Command**: None (leave empty).
   - **Output Directory**: `./` (or leave empty).
6. Click **Deploy**. Vercel will automatically trigger a new production build on every `git push`.

---

## ⚙️ Vercel Configuration Details

The project includes a standard `vercel.json` configuration file:
```json
{
  "version": 2,
  "cleanUrls": true,
  "public": true
}
```
- `cleanUrls`: Automatically strips `.html` extensions from your page URLs for clean, professional aesthetics (e.g. `agropledge.com/index` handles standard lookups cleanly).
- `public`: Serves files statically.
