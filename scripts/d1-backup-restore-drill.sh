#!/usr/bin/env bash
#
# Off-Cloudflare backup + a tested restore.  SHU-1355.
#
# D1 Time Travel already gives point-in-time restore for 30 days, so this is
# NOT about daily snapshots. It covers the two things Time Travel does not:
#
#   1. A copy that survives losing Cloudflare account access.
#   2. Proof the copy actually restores. An untested backup is a hypothesis,
#      and it is the step everyone skips.
#
# MSA section 8.4 obliges us to hand over "complete website backups in
# portable format" on 30 days notice, so this is contractual, not hygiene.
#
# Restores into a THROWAWAY database. Production is only ever read.
#
#   bash scripts/d1-backup-restore-drill.sh                  # backup + drill
#   bash scripts/d1-backup-restore-drill.sh --refresh-staging # also refresh staging
#
set -euo pipefail

PROD_DB="hivconnect-db-production"
STAGING_DB="hivconnect-db-staging"
DRILL_DB="hivconnect-db-restore-drill"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="backups/${PROD_DB}-${STAMP}.sql"

REFRESH_STAGING=false
[[ "${1:-}" == "--refresh-staging" ]] && REFRESH_STAGING=true

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die() { printf '\n\033[31m%s\033[0m\n' "$*" >&2; exit 1; }

# Nothing below may ever write to production. Belt and braces.
guard() {
  [[ "$1" == *"production"* ]] && die "REFUSING: '$1' looks like production and this step writes."
  return 0
}

mkdir -p backups

say "1/5  Export production (read-only)"
pnpm exec wrangler d1 export "$PROD_DB" --remote --output="$OUT"
BYTES=$(wc -c < "$OUT" | tr -d ' ')
TABLES=$(grep -c '^CREATE TABLE' "$OUT" || true)
echo "  $OUT"
echo "  ${BYTES} bytes, ${TABLES} tables"
[[ "$BYTES" -lt 1000 ]] && die "Export is suspiciously small. Stopping."

say "2/5  Record production row counts (the thing we verify against)"
COUNTS_PROD="backups/rowcounts-prod-${STAMP}.txt"
for T in users providers resources blog pdf_library faqs pages \
         membership_applications events bylaws service_standards media; do
  C=$(pnpm exec wrangler d1 execute "$PROD_DB" --remote --json \
        --command "SELECT COUNT(*) AS n FROM $T;" 2>/dev/null \
        | grep -o '"n":[0-9]*' | head -1 | cut -d: -f2 || echo "-")
  printf '%-28s %s\n' "$T" "${C:--}" | tee -a "$COUNTS_PROD"
done

say "3/5  Create the throwaway restore target"
guard "$DRILL_DB"
if pnpm exec wrangler d1 info "$DRILL_DB" >/dev/null 2>&1; then
  echo "  $DRILL_DB already exists, deleting it first"
  pnpm exec wrangler d1 delete "$DRILL_DB" --skip-confirmation || true
fi
pnpm exec wrangler d1 create "$DRILL_DB"

say "4/5  Restore the export into $DRILL_DB"
guard "$DRILL_DB"
pnpm exec wrangler d1 execute "$DRILL_DB" --remote --file="$OUT" --yes
echo "  restored"

say "5/5  Verify: restored counts must match production"
FAIL=0
while read -r T EXPECTED; do
  [[ "$EXPECTED" == "-" ]] && continue
  GOT=$(pnpm exec wrangler d1 execute "$DRILL_DB" --remote --json \
          --command "SELECT COUNT(*) AS n FROM $T;" 2>/dev/null \
          | grep -o '"n":[0-9]*' | head -1 | cut -d: -f2 || echo "ERR")
  if [[ "$GOT" == "$EXPECTED" ]]; then
    printf '  ✓ %-26s %s\n' "$T" "$GOT"
  else
    printf '  ✗ %-26s expected %s, got %s\n' "$T" "$EXPECTED" "$GOT"
    FAIL=1
  fi
done < "$COUNTS_PROD"

if [[ "$FAIL" -eq 0 ]]; then
  say "RESTORE VERIFIED. The backup is real, not hypothetical."
else
  die "RESTORE MISMATCH. Do not close SHU-1355. Investigate before trusting this backup."
fi

if $REFRESH_STAGING; then
  say "Bonus: refresh $STAGING_DB from the same export"
  guard "$STAGING_DB"
  echo "  This DESTROYS everything currently in staging."
  read -r -p "  Continue? [y/N] " ans
  if [[ "${ans:-n}" =~ ^[Yy]$ ]]; then
    # Drop existing tables so the export's CREATE TABLE statements apply cleanly.
    pnpm exec wrangler d1 execute "$STAGING_DB" --remote --json \
      --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%';" \
      | grep -o '"name":"[^"]*"' | cut -d'"' -f4 \
      | while read -r T; do
          pnpm exec wrangler d1 execute "$STAGING_DB" --remote --yes \
            --command "DROP TABLE IF EXISTS \"$T\";" >/dev/null
        done
    pnpm exec wrangler d1 execute "$STAGING_DB" --remote --file="$OUT" --yes
    echo "  staging now mirrors production as of $STAMP"
    echo "  NOTE: staging now contains real membership applications (PII)."
    echo "  Treat it with the same care as production, or scrub it."
  fi
fi

say "Clean up"
read -r -p "Delete $DRILL_DB? [Y/n] " ans
if [[ ! "${ans:-y}" =~ ^[Nn]$ ]]; then
  pnpm exec wrangler d1 delete "$DRILL_DB" --skip-confirmation
fi

cat <<NOTE

Backup kept at: $OUT

That file is the deliverable. Move it somewhere that is NOT Cloudflare,
which is the entire point: encrypted cloud storage, or an external drive.
It contains real membership applications, so it is PII. Do not park it in
a shared Drive folder without thinking about who can see it.

backups/ is gitignored. Never commit these.
NOTE
