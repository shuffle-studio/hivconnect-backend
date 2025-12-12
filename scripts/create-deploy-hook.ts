/**
 * Create a Cloudflare Pages Deploy Hook programmatically
 *
 * Run: CLOUDFLARE_API_TOKEN=your_token pnpm tsx scripts/create-deploy-hook.ts
 */

const ACCOUNT_ID = '77936f7f1fecd5df8504adaf96fad1fb';
const PROJECT_NAME = 'hivconnect-frontend';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

if (!API_TOKEN) {
  console.error('❌ Error: CLOUDFLARE_API_TOKEN environment variable is required');
  console.error('');
  console.error('To get your API token:');
  console.error('1. Go to: https://dash.cloudflare.com/profile/api-tokens');
  console.error('2. Click "Create Token"');
  console.error('3. Use "Edit Cloudflare Workers" template or create custom with:');
  console.error('   - Account.Cloudflare Pages: Edit');
  console.error('4. Copy the token and run:');
  console.error('   CLOUDFLARE_API_TOKEN=your_token pnpm tsx scripts/create-deploy-hook.ts');
  process.exit(1);
}

async function createDeployHook() {
  console.log('🔧 Creating Cloudflare Pages deploy hook...\n');

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deploy_hooks`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'PayloadCMS Content Update',
          branch: 'main', // Match the actual git branch
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Failed to create deploy hook:');
      console.error(JSON.stringify(errorData, null, 2));

      if (response.status === 403) {
        console.error('\n💡 Your API token may not have the correct permissions.');
        console.error('   Required permission: Account.Cloudflare Pages: Edit');
      }

      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ API Response received!\n');
    console.log('Full response:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n' + '━'.repeat(60));

    const hook = data.result;

    if (!hook) {
      console.error('❌ No result in response. Full response:', data);
      process.exit(1);
    }

    // Construct the webhook URL using the hook_id
    const hookId = hook.hook_id || hook.id;
    const webhookUrl = `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/${hookId}`;

    console.log('📝 Deploy Hook Details:');
    console.log(`   Name: ${hook.name}`);
    console.log(`   Hook ID: ${hookId}`);
    console.log(`   Branch: ${hook.branch}`);
    console.log(`   Created: ${hook.created_on}`);
    console.log('━'.repeat(60));
    console.log('\n🔗 Deploy Hook URL:');
    console.log(webhookUrl);
    console.log('━'.repeat(60));
    console.log('\n📋 Next Steps:');
    console.log('1. Add this to wrangler.jsonc under "vars":');
    console.log(`   "DEPLOY_HOOK_URL": "${webhookUrl}"`);
    console.log('\n2. Redeploy the backend:');
    console.log('   NODE_ENV=production pnpm run deploy:app');
    console.log('\n3. Test by updating content in PayloadCMS admin panel');
    console.log('   The frontend will automatically rebuild in 10 seconds!');
    console.log('━'.repeat(60));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createDeployHook();
