# Production Deployment Plan

**Date**: December 3, 2025
**Environments**:
- Staging: https://hivconnect-backend-staging.shuffle-seo.workers.dev ✅ LIVE
- Production: `hivconnect-backend` (not yet deployed)

---

## Pre-Deployment Checklist

### ✅ Staging Validation (COMPLETED)
- [x] 17 providers imported successfully
- [x] All CRUD operations tested and working
- [x] API endpoints returning valid data
- [x] Authentication working correctly
- [x] Admin panel accessible and functional

### Current Status
- **Staging Database**: `hivconnect-db-staging` - 17 providers, all active
- **Production Database**: `hivconnect-db-production` - Empty (0 tables)
- **Production Worker**: Not deployed
- **Frontend**: Using hardcoded data, needs to point to production API

---

## Production Deployment Steps

### Step 1: Run Database Migrations on Production

```bash
cd /Users/kevincan/Desktop/ShuffleSEO/mshtga-backend-workers

# Set environment to use default (production) configuration
unset CLOUDFLARE_ENV

# Run database migrations
NODE_ENV=production PAYLOAD_SECRET=ignore pnpm payload migrate

# Optimize production database
npx wrangler d1 execute hivconnect-db-production --command 'PRAGMA optimize' --remote
```

**Expected Result**: Database tables created (Users, Providers, etc.)

**Verification**:
```bash
npx wrangler d1 info hivconnect-db-production
# Should show num_tables > 0
```

---

### Step 2: Deploy Worker to Production

```bash
# Build and deploy production worker
# (No CLOUDFLARE_ENV set = uses default/production config)
pnpm run deploy:app

# Or manually:
opennextjs-cloudflare build
opennextjs-cloudflare deploy
```

**Expected Result**:
- Worker deployed to `hivconnect-backend.shuffle-seo.workers.dev`
- Admin panel accessible at `https://hivconnect-backend.shuffle-seo.workers.dev/admin`

**Verification**:
```bash
curl -I https://hivconnect-backend.shuffle-seo.workers.dev/api/providers
# Should return HTTP 200
```

---

### Step 3: Create Admin User (If Needed)

The admin user might auto-create during first visit to `/admin`, or you may need to create it manually.

**Option A - Via Admin Panel**:
1. Visit `https://hivconnect-backend.shuffle-seo.workers.dev/admin`
2. Complete initial setup wizard if prompted
3. Create admin user: kevin@shuffleseo.com

**Option B - Via API** (if first-user registration is open):
```bash
curl -X POST https://hivconnect-backend.shuffle-seo.workers.dev/api/users/first \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kevin@shuffleseo.com",
    "password": "YOUR_PASSWORD",
    "name": "Kevin Candelaria"
  }'
```

---

### Step 4: Import Providers to Production

```bash
cd /Users/kevincan/Desktop/ShuffleSEO/mshtga-backend-workers

# Update import script to use production URL
# Edit scripts/import-authenticated.ts line 11:
# Change: const STAGING_URL = 'https://hivconnect-backend-staging.shuffle-seo.workers.dev'
# To:     const STAGING_URL = 'https://hivconnect-backend.shuffle-seo.workers.dev'

# Or create production-specific script
cat > scripts/import-production.ts << 'EOF'
/**
 * Import providers to PRODUCTION
 * Run: ADMIN_PASSWORD=yourpassword pnpm tsx scripts/import-production.ts
 */

// Import provider data and transformation function
import { providers, transformProvider } from './import-providers'

const PRODUCTION_URL = 'https://hivconnect-backend.shuffle-seo.workers.dev'
const ADMIN_EMAIL = 'kevin@shuffleseo.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!ADMIN_PASSWORD) {
  console.error('❌ Error: ADMIN_PASSWORD environment variable is required')
  console.error('Usage: ADMIN_PASSWORD=yourpassword pnpm tsx scripts/import-production.ts')
  process.exit(1)
}

// Confirm production deployment
console.log('⚠️  WARNING: You are about to import to PRODUCTION')
console.log(`URL: ${PRODUCTION_URL}`)
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...')

await new Promise(resolve => setTimeout(resolve, 5000))

interface LoginResponse {
  message: string
  user: any
  token?: string
  exp?: number
}

async function login(): Promise<string | null> {
  try {
    console.log('🔐 Logging in as', ADMIN_EMAIL, '...')
    const response = await fetch(`${PRODUCTION_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Login failed (${response.status}):`, errorText)
      return null
    }

    const setCookieHeader = response.headers.get('set-cookie')
    if (!setCookieHeader) {
      console.error('❌ No authentication cookie received')
      return null
    }

    console.log('✅ Login successful!\n')
    return setCookieHeader
  } catch (error) {
    console.error('❌ Login error:', error)
    return null
  }
}

async function createProvider(providerData: any, authCookie: string): Promise<boolean> {
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/providers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: authCookie,
      },
      body: JSON.stringify(providerData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`   ❌ Failed (${response.status}):`, errorText.substring(0, 200))
      return false
    }

    const result = await response.json()
    console.log(`   ✅ Created (ID: ${result.doc.id})`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting PRODUCTION import...\n')
  console.log(`API URL: ${PRODUCTION_URL}`)
  console.log(`Providers to import: ${providers.length}\n`)

  const authCookie = await login()
  if (!authCookie) {
    console.error('❌ Cannot proceed without authentication')
    process.exit(1)
  }

  let successCount = 0
  let errorCount = 0

  console.log('📦 Importing providers...\n')

  for (const oldProvider of providers) {
    try {
      const transformedProvider = transformProvider(oldProvider)
      console.log(`[${successCount + errorCount + 1}/${providers.length}] ${transformedProvider.name}`)

      const success = await createProvider(transformedProvider, authCookie)
      if (success) {
        successCount++
      } else {
        errorCount++
      }
    } catch (error: any) {
      console.error(`   ❌ Transform error:`, error.message)
      errorCount++
    }

    console.log('')
  }

  console.log('='.repeat(60))
  console.log('✨ Import complete!')
  console.log(`✅ Successful: ${successCount}`)
  console.log(`❌ Failed: ${errorCount}`)
  console.log(`📊 Total: ${providers.length}`)
  console.log('='.repeat(60))

  console.log('\n🔍 Verifying import...')
  const verifyResponse = await fetch(`${PRODUCTION_URL}/api/providers?limit=100`)
  const verifyData = await verifyResponse.json()
  console.log(`✅ Database now contains ${verifyData.totalDocs} providers`)

  if (successCount === providers.length) {
    console.log('\n🎉 All providers imported to PRODUCTION successfully!')
    process.exit(0)
  } else {
    console.log('\n⚠️  Some providers failed to import. Check errors above.')
    process.exit(1)
  }
}

main()
EOF

# Run production import
ADMIN_PASSWORD=your_password pnpm tsx scripts/import-production.ts
```

**Expected Result**: All 17 providers imported to production database

**Verification**:
```bash
curl https://hivconnect-backend.shuffle-seo.workers.dev/api/providers?limit=100 | jq '.totalDocs'
# Should return: 17
```

---

### Step 5: Configure Custom Domain (Optional)

If you want to use `api.hivconnectcnj.org` instead of the default workers.dev domain:

1. Go to Cloudflare Dashboard → Workers → `hivconnect-backend`
2. Click "Triggers" tab
3. Add custom domain: `api.hivconnectcnj.org`
4. Update DNS:
   - Type: CNAME
   - Name: api
   - Target: hivconnect-backend.shuffle-seo.workers.dev
   - Proxy: Enabled (orange cloud)

**Verification**:
```bash
curl https://api.hivconnectcnj.org/api/providers
```

---

### Step 6: Update Frontend to Use Production API

**In Frontend Repository** (`/Users/kevincan/Desktop/ShuffleSEO/mshtga`):

1. Update environment variables:
```bash
# Create/update .env.production
echo "PUBLIC_API_URL=https://hivconnect-backend.shuffle-seo.workers.dev" > .env.production

# Or if using custom domain:
echo "PUBLIC_API_URL=https://api.hivconnectcnj.org" > .env.production
```

2. Update Cloudflare Pages environment variables:
   - Go to Cloudflare Dashboard → Pages → hivconnect-frontend
   - Settings → Environment Variables
   - Production: Add `PUBLIC_API_URL` = `https://hivconnect-backend.shuffle-seo.workers.dev`

3. Update CORS in backend (if needed):
```typescript
// Backend: src/payload.config.ts
cors: [
  'https://hivconnectcnj.org',
  'https://0da7b960.hivconnect-frontend.pages.dev', // Current Pages deployment
  'http://localhost:4321', // Local dev
],
```

4. Rebuild and deploy frontend:
```bash
cd /Users/kevincan/Desktop/ShuffleSEO/mshtga
npm run build
npx wrangler pages deploy dist --project-name=hivconnect-frontend
```

---

## Verification & Testing

### Backend Production Tests

```bash
# Test API endpoints
curl https://hivconnect-backend.shuffle-seo.workers.dev/api/providers | jq '.totalDocs'
curl https://hivconnect-backend.shuffle-seo.workers.dev/api/providers/17 | jq '.name'

# Test admin panel (browser)
open https://hivconnect-backend.shuffle-seo.workers.dev/admin

# Run CRUD test against production
cd /Users/kevincan/Desktop/ShuffleSEO/mshtga-backend-workers
# Edit scripts/test-crud.ts to use production URL
ADMIN_PASSWORD=your_password pnpm tsx scripts/test-crud.ts
```

### Frontend Production Tests

```bash
# Test provider listing
open https://hivconnectcnj.org/find-services

# Test individual provider pages
open https://hivconnectcnj.org/providers/eric-chandler-health-center

# Check browser console for API calls
# Should see requests to: https://hivconnect-backend.shuffle-seo.workers.dev/api/providers
```

---

## Rollback Plan

If issues arise in production:

1. **Revert frontend to staging API**:
   ```bash
   # In Cloudflare Pages dashboard
   # Change PUBLIC_API_URL back to staging
   PUBLIC_API_URL=https://hivconnect-backend-staging.shuffle-seo.workers.dev
   ```

2. **Rollback worker deployment**:
   ```bash
   npx wrangler rollback
   # Choose previous deployment from list
   ```

3. **Database rollback**:
   - D1 doesn't support rollback, but you can:
   - Delete problematic data via admin panel
   - Re-run migrations if needed
   - Drop and recreate database (nuclear option)

---

## Post-Deployment Monitoring

### Health Checks

Set up monitoring for:
- API uptime: `https://hivconnect-backend.shuffle-seo.workers.dev/api/providers`
- Admin panel: `https://hivconnect-backend.shuffle-seo.workers.dev/admin`
- Database queries (Cloudflare Dashboard)

### Metrics to Track

- **Database**:
  - Query count
  - Response times
  - Storage usage

- **Worker**:
  - Request count
  - Error rate
  - CPU time
  - Memory usage

- **Frontend**:
  - Page load times
  - API call success rate
  - User traffic

---

## Cost Estimates

**Cloudflare Workers Free Tier**:
- 100,000 requests/day
- 10ms CPU time/request

**Estimated Usage** (based on current traffic):
- API calls: ~1,000/day (well within free tier)
- D1 queries: ~5,000/day (free up to 5M reads/day)
- R2 storage: 0 GB (no media uploads yet)

**Cost**: $0/month (within free tier)

---

## Timeline

**Estimated Time**: 30-45 minutes

- Step 1 (Migrations): 2-3 minutes
- Step 2 (Deploy Worker): 5-10 minutes
- Step 3 (Create Admin): 2 minutes
- Step 4 (Import Providers): 3-5 minutes
- Step 5 (Custom Domain): 5-10 minutes (optional)
- Step 6 (Update Frontend): 10-15 minutes
- Verification: 5-10 minutes

---

## Support & Documentation

- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **PayloadCMS Docs**: https://payloadcms.com/docs
- **Project Context**: `CLAUDE.md`
- **Backend Docs**: `HIV Connect Central NJ Backend.md`

---

## Sign-Off

**Prepared By**: Claude Code Agent
**Reviewed By**: [Kevin - CTO]
**Approved By**: [José - CEO]
**Deployment Date**: [TBD]

---

## Notes

- Staging environment will remain active for testing future updates
- All changes should be tested in staging before production deployment
- Database backups: D1 automatically replicates data, but consider periodic exports
- Security: Keep admin credentials secure, rotate passwords regularly
