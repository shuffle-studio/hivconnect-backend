/**
 * Get Cloudflare Pages project details
 */

const ACCOUNT_ID = '77936f7f1fecd5df8504adaf96fad1fb';
const PROJECT_NAME = 'hivconnect-frontend';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'vr_kKPeVRJhlFpLH2eWq7AIJm4LtSSDSaY1nw5Xl';

async function getProjectDetails() {
  console.log(`📋 Getting project details for: ${PROJECT_NAME}\n`);

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}`,
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
      console.error('❌ Failed to get project:');
      console.error(JSON.stringify(errorData, null, 2));
      process.exit(1);
    }

    const data = await response.json();
    console.log('✅ Project details retrieved!\n');
    console.log(JSON.stringify(data, null, 2));

    const project = data.result;
    console.log('\n📌 Summary:');
    console.log(`Name: ${project.name}`);
    console.log(`Production Branch: ${project.production_branch}`);
    console.log(`Created: ${project.created_on}`);
    console.log(`Source: ${project.source?.type || 'direct upload'}`);
    if (project.source?.config) {
      console.log(`Repository: ${project.source.config.owner}/${project.source.config.repo_name}`);
      console.log(`Production Branch (from source): ${project.source.config.production_branch}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getProjectDetails();
