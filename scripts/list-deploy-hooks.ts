/**
 * List all deploy hooks for a Cloudflare Pages project
 */

const ACCOUNT_ID = '77936f7f1fecd5df8504adaf96fad1fb';
const PROJECT_NAME = 'hivconnect-frontend';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'vr_kKPeVRJhlFpLH2eWq7AIJm4LtSSDSaY1nw5Xl';

async function listDeployHooks() {
  console.log('📋 Listing deploy hooks for project:', PROJECT_NAME, '\n');

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deploy_hooks`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Failed to list deploy hooks:');
      console.error(JSON.stringify(errorData, null, 2));
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Deploy hooks retrieved!\n');
    console.log(JSON.stringify(data, null, 2));

    if (data.result && data.result.length > 0) {
      console.log('\n📌 Summary:');
      data.result.forEach((hook: any) => {
        const hookId = hook.hook_id || hook.id;
        const webhookUrl = `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/${hookId}`;
        console.log(`\nName: ${hook.name}`);
        console.log(`Hook ID: ${hookId}`);
        console.log(`Branch: ${hook.branch}`);
        console.log(`Created: ${hook.created_on}`);
        console.log(`Webhook URL: ${webhookUrl}`);
      });
    } else {
      console.log('\n⚠️ No deploy hooks found for this project');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listDeployHooks();
