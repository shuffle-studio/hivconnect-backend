/**
 * Test the deploy hook webhook directly
 * This simulates what happens when PayloadCMS triggers the webhook
 */

const DEPLOY_HOOK_URL = 'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/60788d5a-a22a-4bcf-a427-bdba665710d9';

async function testWebhook() {
  console.log('🧪 Testing Deploy Hook Webhook\n');
  console.log(`📡 Webhook URL: ${DEPLOY_HOOK_URL}\n`);

  console.log('🚀 Triggering webhook...');
  const startTime = Date.now();

  try {
    const response = await fetch(DEPLOY_HOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: true,
        triggeredAt: new Date().toISOString(),
        triggeredBy: 'manual-test-script'
      })
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      const result = await response.json();
      console.log(`✅ Webhook triggered successfully! (${duration}ms)\n`);
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('\n📋 Next Steps:');
      console.log('   1. Wait ~30 seconds for deployment to start');
      console.log('   2. Check deployments with:');
      console.log('      pnpm wrangler pages deployment list --project-name=hivconnect-frontend | head -5');
      console.log('   3. You should see a new deployment at the top of the list');
    } else {
      const error = await response.text();
      console.error(`❌ Webhook failed: ${response.status} ${response.statusText}`);
      console.error('Response:', error);
    }
  } catch (error) {
    console.error('❌ Error triggering webhook:', error);
  }
}

testWebhook().catch(console.error);
