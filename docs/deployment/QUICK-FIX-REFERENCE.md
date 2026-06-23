# PayloadCMS + Cloudflare Workers - Quick Fix Reference

## TL;DR - The 4 Critical Fixes

If you encounter deployment errors with PayloadCMS v3 + Next.js 15 on Cloudflare Workers, apply these fixes:

### 1. Update PayloadCMS to Latest Version
```bash
pnpm update payload@latest @payloadcms/db-d1-sqlite@latest @payloadcms/next@latest @payloadcms/richtext-lexical@latest @payloadcms/storage-r2@latest @payloadcms/ui@latest
```

### 2. Add Webpack IgnorePlugin (next.config.ts)
```typescript
import webpack from 'webpack'

const nextConfig = {
  webpack: (webpackConfig: any) => {
    // ... existing config

    webpackConfig.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
      }),
    )

    return webpackConfig
  },
}
```

Don't forget: `pnpm add -D webpack`

### 3. Disable GraphQL Playground (src/payload.config.ts)
```typescript
export default buildConfig({
  graphQL: {
    disablePlaygroundInProduction: true,
  },
})
```

### 4. Add Compatibility Flags (wrangler.jsonc)
```jsonc
{
  "compatibility_flags": [
    "nodejs_compat",
    "expose_global_message_channel",  // For MessagePort
    "enable_weak_ref",                 // For WeakRef
  ]
}
```

## Error → Fix Mapping

| Error | Fix | File |
|-------|-----|------|
| `Failed to collect page data for /api/graphql-playground` | Disable GraphQL playground | `payload.config.ts` |
| `UnhandledSchemeError: Reading from 'cloudflare:sockets'` | Webpack IgnorePlugin | `next.config.ts` |
| `ReferenceError: MessagePort is not defined` | Add `expose_global_message_channel` flag | `wrangler.jsonc` |
| `ReferenceError: WeakRef is not defined` | Add `enable_weak_ref` flag | `wrangler.jsonc` |

## Deployment Commands

```bash
# Deploy everything (migrations + app)
CLOUDFLARE_ENV=staging pnpm run deploy

# Or step by step:
CLOUDFLARE_ENV=staging pnpm run deploy:database  # Migrations only
CLOUDFLARE_ENV=staging pnpm run deploy:app       # Worker only

# Monitor logs
npx wrangler tail hivconnect-backend-staging
```

## Quick Test

```bash
# Admin should return 200
curl -I https://your-worker.workers.dev/admin

# API endpoint
curl https://your-worker.workers.dev/api/providers
```

## Links
- Full guide: `CLOUDFLARE-WORKERS-DEPLOYMENT.md`
- PayloadCMS Docs: https://payloadcms.com/docs
- Cloudflare Workers: https://developers.cloudflare.com/workers/
