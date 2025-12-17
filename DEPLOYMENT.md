# HIV Connect Central NJ Backend - Deployment Guide

**Last Updated**: December 17, 2025
**Repository**: https://github.com/kevinshuffle/hivconnect-backend
**CTO**: Kevin / Shuffle SEO

---

## 🚨 CRITICAL POLICY: PRODUCTION ONLY - NO STAGING

**Per explicit client directive**: This project does NOT use staging environments.

### ⚠️ DO NOT CREATE NEW DEPLOYMENTS

**NEVER create**:
- ❌ New Cloudflare Pages projects for HIV Connect
- ❌ New Cloudflare Workers for HIV Connect
- ❌ Staging/dev/test environments
- ❌ Additional D1 databases or R2 buckets

**There is ONLY ONE backend and ONE frontend**:
- Backend: `hivconnect-backend-production` (Cloudflare Worker)
- Frontend: `hivconnect-frontend` (Cloudflare Pages)

**If you need to deploy**, ALWAYS use:
```bash
# Backend - PRODUCTION ONLY
CLOUDFLARE_ENV=production pnpm run deploy:app

# Frontend
CLOUDFLARE_ACCOUNT_ID=77936f7f1fecd5df8504adaf96fad1fb npx wrangler pages deploy dist --project-name=hivconnect-frontend
```

### Historical Note: Two-Backend Mistake (FIXED December 17, 2025)

**What Happened**: Accidentally created TWO workers:
- `hivconnect-backend` (staging - 10 deployments) - **DELETED**
- `hivconnect-backend-production` (production - 3 deployments) - **KEPT**

**Root Cause**: Deploying without `CLOUDFLARE_ENV=production` created the staging worker.

**Fix Applied**:
1. Deleted `hivconnect-backend` worker completely
2. Updated all config files to reference production worker only
3. Standardized environment variables to `PUBLIC_PAYLOAD_URL`
4. Created this documentation to prevent recurrence

**Lesson**: ALWAYS include `CLOUDFLARE_ENV=production` when deploying backend.

### Production URLs

- **Backend API**: https://hivconnect-backend-production.shuffle-seo.workers.dev
- **CMS Admin**: https://hivconnect-backend-production.shuffle-seo.workers.dev/admin
- **Database**: Cloudflare D1 (`hivconnect-db-production`)
- **Storage**: Cloudflare R2 (`hivconnect-media-production`)
- **Frontend**: https://hivconnectcnj.org

---

## Automatic Deployment (Recommended)

### Git-Based Auto-Deployment

Every push to the `main` branch automatically deploys to production via GitHub Actions.

```bash
# Make changes
git add .
git commit -m "Update provider collection schema"
git push origin main

# GitHub Actions automatically:
# 1. Runs tests
# 2. Builds with OpenNext
# 3. Deploys to Cloudflare Workers
# 4. Available at: https://hivconnect-backend-production.shuffle-seo.workers.dev
```

**Deployment Time**: 2-3 minutes

**View Status**:
```bash
gh run list
gh run watch  # Watch latest deployment
```

---

## Manual Deployment (Development/Testing)

### Prerequisites

```bash
# Install dependencies
pnpm install

# Login to Cloudflare
npx wrangler login

# Set environment variables
cp .env.example .env
# Edit .env with your secrets
```

### Deploy to Production

```bash
# Full deployment (build + deploy)
NODE_ENV=production pnpm run deploy:app

# Or step-by-step:
pnpm run build              # Build Next.js app
pnpm run deploy:app         # Deploy to Cloudflare Workers
```

### Deploy Database Migrations

```bash
# Create new migration
NODE_ENV=production pnpm payload migrate:create

# Run pending migrations
NODE_ENV=production pnpm run deploy:database
```

---

## Webhook System for Frontend Rebuilds

### How It Works

When content is updated in PayloadCMS, the backend automatically triggers a frontend rebuild via Cloudflare Pages deploy hook.

### File: `src/hooks/triggerFrontendRebuild.ts`

```typescript
/**
 * Automatic frontend rebuild trigger
 *
 * When content changes (create, update, delete):
 * 1. Hook detects change
 * 2. Calls Cloudflare Pages deploy hook
 * 3. Frontend rebuilds with latest data
 * 4. Changes live in 2-3 minutes
 */

export const afterChangeHook: CollectionAfterChangeHook = async ({
  doc,
  operation,
  collection,
}) => {
  const operationLabel = operation === 'create' ? 'created' : 'updated';
  const docId = doc.id || doc.slug || doc.name || 'unknown';

  // IMPORTANT: Must await to ensure webhook completes before Worker terminates
  await triggerFrontendRebuild(collection.slug, operationLabel, docId).catch((error) => {
    console.error('Error triggering rebuild:', error);
  });

  return doc;
};
```

### Critical Fix: The Await Issue

**Problem**: Without `await`, Cloudflare Workers terminate before the webhook HTTP request completes.

**Before** (broken):
```typescript
triggerFrontendRebuild(...).catch((error) => {
  console.error('Error triggering rebuild:', error);
});
// Worker terminates immediately → webhook never fires
```

**After** (working):
```typescript
await triggerFrontendRebuild(...).catch((error) => {
  console.error('Error triggering rebuild:', error);
});
// Worker waits for webhook to complete → frontend rebuilds successfully
```

### Collections with Auto-Rebuild Hooks

These collections trigger frontend rebuilds on change:

- ✅ **Providers** (`src/collections/Providers.ts`)
- ✅ **Resources** (`src/collections/Resources.ts`)
- ✅ **Blog** (`src/collections/Blog.ts`)
- ✅ **PDFLibrary** (`src/collections/PDFLibrary.ts`)
- ✅ **SiteSettings** (`src/globals/SiteSettings.ts`)

### Viewing Webhook Logs

**Real-time monitoring**:
```bash
npx wrangler tail hivconnect-backend --format pretty
```

**Expected output on content change**:
```
PATCH /api/providers/7 - Ok @ 7:48:35 AM
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📢 CONTENT CHANGE DETECTED
     Collection: providers
     Operation: updated
     Document ID: 7
     Timestamp: 2025-12-04T12:48:35.124Z
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🚀 Triggering frontend rebuild...
     Deploy Hook URL: https://api.cloudflare.com/.../deploy_hooks/...
     Response Status: 200 OK
     Response Data: {"result":{"id":"48ef8adb-..."},"success":true}
  ✅ Frontend rebuild triggered successfully!
     Deployment ID: 48ef8adb-eeef-46d1-be6b-151669cf4346
     Your changes will be live in ~2-3 minutes
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Manually Trigger Frontend Rebuild

```bash
# Via curl
curl -X POST "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/3e240bd9-fb8e-4972-b69a-32436151cfba"

# Should return:
# {
#   "result": {
#     "id": "925607c1-949a-424a-a5dd-51857647a5ef"
#   },
#   "success": true
# }
```

---

## Environment Variables

### Required in `wrangler.jsonc`

```jsonc
{
  "vars": {
    "PAYLOAD_PUBLIC_SERVER_URL": "https://hivconnect-backend-production.shuffle-seo.workers.dev",
    "DEPLOY_HOOK_URL": "https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/2282d760-7d13-4023-bc61-9b85b707f129",
    "PAYLOAD_SECRET": "N3DHalBhL4HWguvVag6xbyEugcS/Ovstd/PmQCymkPA="
  }
}
```

### Required in GitHub Secrets

```
CLOUDFLARE_API_TOKEN=vr_kKPeVRJhlFpLH2eWq7AIJm4LtSSDSaY1nw5Xl
CLOUDFLARE_ACCOUNT_ID=77936f7f1fecd5df8504adaf96fad1fb
PAYLOAD_SECRET=N3DHalBhL4HWguvVag6xbyEugcS/Ovstd/PmQCymkPA=
```

### How to Update Environment Variables

**For Cloudflare Workers** (runtime):
1. Edit `wrangler.jsonc`
2. Commit and push to Git
3. GitHub Actions will deploy with new vars

**For GitHub Actions** (build time):
1. Go to: https://github.com/kevinshuffle/hivconnect-backend/settings/secrets/actions
2. Update secret value
3. Next deployment will use new secret

---

## GitHub Actions Workflow

### File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy PayloadCMS Backend

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Deploy to Cloudflare Workers
        run: NODE_ENV=production pnpm run deploy:app
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          PAYLOAD_SECRET: ${{ secrets.PAYLOAD_SECRET }}

      - name: Deployment summary
        run: |
          echo "✅ Backend deployed successfully to Cloudflare Workers"
          echo "🔗 URL: https://hivconnect-backend-production.shuffle-seo.workers.dev"
```

### Workflow Triggers

- ✅ Push to `main` branch
- ✅ Manual workflow dispatch (from GitHub UI)

### Checking Deployment Status

```bash
# List recent deployments
gh run list --limit 5

# Watch specific deployment
gh run watch <run-id>

# View logs for failed deployment
gh run view <run-id> --log-failed
```

---

## Why GitHub Actions Instead of Cloudflare Pages Git Integration?

### The Problem

**Cloudflare Pages** expects simple static sites:
```bash
npm install
npm run build  # → outputs to /dist
```

**PayloadCMS** needs complex Next.js build:
```bash
npm install
opennextjs-cloudflare build   # Transform Next.js → Worker format
opennextjs-cloudflare deploy  # Deploy to Workers (not Pages)
```

### Why Pages Git Integration Doesn't Work

1. **No OpenNext Support**: Pages can't run the OpenNext transformation
2. **Wrong Platform**: PayloadCMS deploys to Workers, not Pages
3. **Limited Build Control**: Can't customize build steps

### Why GitHub Actions Works

1. ✅ **Full Build Control**: Run any commands we need
2. ✅ **OpenNext Transformation**: Properly converts Next.js to Workers format
3. ✅ **Deploy to Workers**: Uses Wrangler CLI to deploy to correct platform
4. ✅ **Secrets Management**: Secure handling of API tokens
5. ✅ **Automatic**: Triggers on every push to main

---

## Troubleshooting

### Issue: GitHub Actions Deployment Fails

**Check logs**:
```bash
gh run view <run-id> --log
```

**Common causes**:
- Missing GitHub secrets
- `PAYLOAD_SECRET` not set
- Wrangler authentication failed
- TypeScript errors in code

**Solution**:
1. Verify all secrets are set in GitHub
2. Check for code errors locally: `pnpm run build`
3. Re-run failed workflow

### Issue: Webhook Not Triggering Frontend Rebuild

**Check Worker logs**:
```bash
npx wrangler tail hivconnect-backend-production --format pretty
```

**Look for**:
```
📢 CONTENT CHANGE DETECTED
🚀 Triggering frontend rebuild...
✅ Frontend rebuild triggered successfully!
```

**If missing**:
- Verify `DEPLOY_HOOK_URL` is set in `wrangler.jsonc`
- Check hook is added to collection (see `afterChangeHook`)
- Ensure `await` is used in hook (critical!)

### Issue: Frontend Not Updating After Rebuild

**Verify rebuild completed**:
- Go to: https://dash.cloudflare.com → Pages → hivconnect-frontend → Deployments
- Check latest deployment status
- Should see deployment at timestamp matching webhook trigger

**If build failed**:
- Check Cloudflare Pages build logs
- Verify `PUBLIC_API_URL` environment variable is set
- Ensure backend API is accessible during build

---

## Local Development

### Run Backend Locally

```bash
# Start development server
pnpm dev

# Opens at:
# http://localhost:3000       - Homepage
# http://localhost:3000/admin - PayloadCMS admin
# http://localhost:3000/api   - API endpoints
```

### Test API Endpoints Locally

```bash
# Get all providers
curl http://localhost:3000/api/providers

# Get single provider
curl http://localhost:3000/api/providers/raritan-bay-medical-center

# Get resources
curl http://localhost:3000/api/resources
```

### Local Database

**SQLite file**: `payload.db` (created automatically)

**Migrations**:
```bash
# Create migration
pnpm payload migrate:create

# Run migrations
pnpm payload migrate
```

---

## Production Monitoring

### Real-time Logs

```bash
# View all logs
npx wrangler tail hivconnect-backend-production --format pretty

# Filter for errors only
npx wrangler tail hivconnect-backend-production --format pretty | grep ERROR

# Filter for webhook activity
npx wrangler tail hivconnect-backend-production --format pretty | grep "CONTENT CHANGE"
```

### Check API Health

```bash
# Test API is responding
curl https://hivconnect-backend-production.shuffle-seo.workers.dev/api/providers

# Should return:
# {"docs":[...],"totalDocs":17,...}
```

### Admin UI Access

**URL**: https://hivconnect-backend-production.shuffle-seo.workers.dev/admin

**Credentials**: Set during initial setup

---

## Next Steps

After successful deployment:

1. ✅ Verify automatic rebuilds work (update a provider, wait 2-3 minutes)
2. ✅ Add remaining collections (Resources, Blog, etc.)
3. ✅ Populate content in PayloadCMS admin
4. ✅ Set up database backups
5. ✅ Configure monitoring/alerts

---

**End of Document**
