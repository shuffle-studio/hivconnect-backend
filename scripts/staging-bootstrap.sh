#!/usr/bin/env bash
#
# Finish the staging environment: secrets, schema, smoke test.
#
# Staging was provisioned 2 Dec 2025 and never connected. The Worker now
# deploys (SHU-1353) but has no secrets and a database roughly nine months
# behind production.
#
# Run from the repo root:  bash scripts/staging-bootstrap.sh
#
set -euo pipefail

ENV_NAME="staging"
WORKER="hivconnect-backend-staging"
DB="hivconnect-db-staging"
URL="https://hivconnect-backend-staging.shufflestudio.workers.dev"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }

say "1/4  Secrets for --env $ENV_NAME"
echo "Secrets are per-environment. Production's are NOT shared with staging."
echo "You will be prompted to paste each value. Ctrl-C to skip any."
echo
echo "PAYLOAD_SECRET must be a value you generate fresh, NOT production's."
echo "Reusing it would let a staging session token authenticate against"
echo "production. Generate one with:  openssl rand -hex 32"
echo

for S in PAYLOAD_SECRET TURNSTILE_SECRET_KEY RESEND_API_KEY; do
  read -r -p "Set $S for staging now? [y/N] " ans
  if [[ "${ans:-n}" =~ ^[Yy]$ ]]; then
    pnpm exec wrangler secret put "$S" --env "$ENV_NAME"
  else
    echo "  skipped $S"
  fi
done

say "2/4  Apply migrations to $DB"
echo "This brings the December snapshot up to the current schema."
read -r -p "Run migrations against STAGING? [y/N] " ans
if [[ "${ans:-n}" =~ ^[Yy]$ ]]; then
  CLOUDFLARE_ENV="$ENV_NAME" NODE_ENV=production pnpm exec payload migrate
  echo "  migrations applied"
else
  echo "  skipped"
fi

say "3/4  Redeploy so the Worker picks up the secrets"
read -r -p "Deploy --env $ENV_NAME? [y/N] " ans
if [[ "${ans:-n}" =~ ^[Yy]$ ]]; then
  # If wrangler asks to repoint login.hivconnectcentralnj.com, answer NO.
  # With routes:[] on the staging env it should no longer ask at all.
  pnpm exec wrangler deploy --env "$ENV_NAME"
fi

say "4/4  Smoke test"
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL/api/events?limit=1" || echo 000)
echo "  GET $URL/api/events -> HTTP $CODE"
if [[ "$CODE" == "200" ]]; then
  echo "  Worker is up and the D1 binding resolves."
else
  echo "  Not 200. Check logs:  pnpm exec wrangler tail --env $ENV_NAME"
fi

say "Done"
cat <<'NOTE'
Staging admin:  https://hivconnect-backend-staging.shufflestudio.workers.dev/admin

You will need a user in the staging database to log in. It is a separate
database, so production accounts do not exist there. Create the first one
through the admin UI on first visit, or seed it from the CMS.

Staging will NOT trigger a frontend rebuild: DEPLOY_HOOK_URL is empty for
this environment on purpose.
NOTE
