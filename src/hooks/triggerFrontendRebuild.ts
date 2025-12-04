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

  // Get deploy hook URL from environment
  const deployHookUrl = process.env.DEPLOY_HOOK_URL;

  if (!deployHookUrl) {
    console.log('⚠️  DEPLOY_HOOK_URL not configured - skipping rebuild');
    return;
  }

  try {
    console.log('🚀 Triggering frontend rebuild...');
    console.log(`   Deploy Hook URL: ${deployHookUrl}`);

    const response = await fetch(deployHookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`   Response Status: ${response.status} ${response.statusText}`);

    const responseData = await response.json();
    console.log(`   Response Data: ${JSON.stringify(responseData)}`);

    if (response.ok) {
      console.log('✅ Frontend rebuild triggered successfully!');
      console.log(`   Deployment ID: ${responseData.result?.id || 'N/A'}`);
      console.log('   Your changes will be live in ~2-3 minutes');
    } else {
      console.error(`❌ Failed to trigger rebuild: ${response.status} ${response.statusText}`);
      console.error(`   Error details: ${JSON.stringify(responseData)}`);
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

  // Trigger rebuild (non-blocking)
  triggerFrontendRebuild(collection.slug, operationLabel, docId).catch((error) => {
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
  // Trigger rebuild (non-blocking)
  triggerFrontendRebuild(global.slug, 'updated', 'global').catch((error) => {
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

  // Trigger rebuild (non-blocking)
  triggerFrontendRebuild(collection.slug, 'deleted', String(docId)).catch((error) => {
    console.error('Error triggering rebuild:', error);
  });

  return doc;
};
