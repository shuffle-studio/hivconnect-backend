/**
 * Trigger automatic frontend rebuild when content changes
 *
 * When content is created, updated, or deleted in PayloadCMS,
 * this hook triggers a Cloudflare Pages deployment via deploy hook.
 */

import { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload';

// Track recent changes to avoid duplicate rebuilds
const recentChanges = new Map<string, number>();
const REBUILD_COOLDOWN = 10000; // 10 second cooldown to batch changes

/**
 * Trigger Cloudflare Pages rebuild
 */
async function triggerFrontendRebuild(collection: string, operation: string, docId: string) {
  const changeKey = `${collection}-${docId}`;
  const now = Date.now();
  const lastChange = recentChanges.get(changeKey);

  // Skip if changed recently (within cooldown period)
  if (lastChange && now - lastChange < REBUILD_COOLDOWN) {
    console.log(`⏭️  Skipping rebuild for ${collection}:${docId} (cooldown active)`);
    return;
  }

  recentChanges.set(changeKey, now);

  console.log('━'.repeat(60));
  console.log('📢 CONTENT CHANGE DETECTED');
  console.log(`   Collection: ${collection}`);
  console.log(`   Operation: ${operation}`);
  console.log(`   Document ID: ${docId}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log('━'.repeat(60));

  // Get GitHub credentials from environment
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO || 'ShuffleSEO/hivconnect-frontend';

  if (!githubToken) {
    console.log('⚠️  GITHUB_TOKEN not configured - skipping rebuild');
    console.log('   Set GITHUB_TOKEN in wrangler.jsonc to enable auto-rebuild');
    return;
  }

  try {
    console.log('🚀 Triggering frontend rebuild via GitHub Actions...');
    console.log(`   Repository: ${githubRepo}`);
    console.log(`   Workflow: deploy-on-webhook.yml`);

    // Trigger GitHub Actions workflow using repository_dispatch
    const apiUrl = `https://api.github.com/repos/${githubRepo}/dispatches`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: 'deploy-frontend',
        client_payload: {
          collection,
          operation,
          docId,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    console.log(`   Response Status: ${response.status} ${response.statusText}`);

    if (response.status === 204) {
      console.log('✅ Frontend rebuild triggered successfully!');
      console.log('   GitHub Actions workflow started');
      console.log('   Check: https://github.com/' + githubRepo + '/actions');
      console.log('   Your changes will be live in ~3-4 minutes');
    } else {
      const responseData = await response.text();
      console.error(`❌ Failed to trigger rebuild: ${response.status} ${response.statusText}`);
      console.error(`   Error details: ${responseData}`);
    }
  } catch (error: any) {
    console.error('❌ Error triggering rebuild:', error.message);
    console.error(`   Error stack: ${error.stack}`);
  }

  console.log('━'.repeat(60));
}

/**
 * Collection hook: Trigger rebuild after create/update
 */
export const afterChangeHook: CollectionAfterChangeHook = async ({
  doc,
  operation,
  collection,
}) => {
  const operationLabel = operation === 'create' ? 'created' : 'updated';
  const docId = doc.id || doc.slug || doc.name || 'unknown';

  // Trigger rebuild (must await to ensure webhook completes before Worker terminates)
  await triggerFrontendRebuild(collection.slug, operationLabel, docId).catch((error) => {
    console.error('Error triggering rebuild:', error);
  });

  return doc;
};

/**
 * Global hook: Trigger rebuild after global update
 */
export const afterChangeGlobalHook: GlobalAfterChangeHook = async ({
  doc,
  global,
}) => {
  // Trigger rebuild (must await to ensure webhook completes before Worker terminates)
  await triggerFrontendRebuild(global.slug, 'updated', 'global').catch((error) => {
    console.error('Error triggering rebuild:', error);
  });

  return doc;
};

/**
 * After delete hook: Trigger rebuild when content is deleted
 */
export const afterDeleteHook: CollectionAfterDeleteHook = async ({
  doc,
  collection,
  id,
  req,
}) => {
  const docId = id || doc?.slug || doc?.name || 'unknown';

  // Trigger rebuild (must await to ensure webhook completes before Worker terminates)
  await triggerFrontendRebuild(collection.slug, 'deleted', String(docId)).catch((error) => {
    console.error('Error triggering rebuild:', error);
  });

  return doc;
};
