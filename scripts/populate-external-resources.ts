/**
 * Populate external resources for SHU-212
 *
 * Adds the following resource categories:
 * - Living with HIV: Information & Resource Centers
 * - New Jersey Resources
 * - Federal Websites
 * - Resources for Providers
 */

const CLOUDFLARE_ACCOUNT_ID = '77936f7f1fecd5df8504adaf96fad1fb';
const API_URL = 'https://hivconnect-backend-production.shuffle-seo.workers.dev';
const ADMIN_EMAIL = 'kevin@shuffleseo.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'er9fmtfKMC$';

// Helper to create richText format
function createRichText(text: string) {
  return {
    root: {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              text: text,
            },
          ],
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  };
}

// Resource data from SHU-212
const resources = [
  // Living with HIV: Information & Resource Centers
  {
    title: 'The Body',
    description: createRichText('Comprehensive HIV/AIDS information, personal stories, and treatment advice.'),
    externalLink: 'https://www.thebody.com/',
    category: 'living_with_hiv',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },
  {
    title: 'POZ',
    description: createRichText('News, information, and inspiration for people living with HIV/AIDS.'),
    externalLink: 'https://www.poz.com/',
    category: 'living_with_hiv',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },
  {
    title: 'Find HRSA funded HIV Care anywhere in the US',
    description: createRichText('Locate HRSA-funded HIV care services throughout the United States.'),
    externalLink: 'https://www.healthline.com/health/hiv-aids/medications-list',
    category: 'living_with_hiv',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },
  {
    title: 'Healthline: HIV/AIDS Medications List',
    description: createRichText('Complete guide to HIV/AIDS medications and treatment options.'),
    externalLink: 'https://www.healthline.com/health/hiv-aids/medications-list',
    category: 'living_with_hiv',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },

  // New Jersey Resources
  {
    title: 'NJ Health: HIV/AIDS',
    description: createRichText('New Jersey Department of Health HIV/AIDS information and resources.'),
    externalLink: 'https://www.nj.gov/health/hivstdtb/hiv-aids/',
    category: 'nj_resources',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },
  {
    title: 'Middlesex County – Ryan White Program',
    description: createRichText('Ryan White HIV/AIDS Program services in Middlesex County.'),
    externalLink: 'https://www.middlesexcountynj.gov/government/departments/department-of-community-services/office-of-human-services/addiction-services/ryan-white-services',
    category: 'nj_resources',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },
  {
    title: 'NJ Office of New Americans - "Know Your Rights"',
    description: createRichText('Information on rights and resources for New Jersey residents.'),
    externalLink: 'https://www.nj.gov/humanservices/njnewamericans/newcomers/rights/',
    category: 'nj_resources',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },

  // Federal Websites
  {
    title: 'HRSA: HIV/AIDS Bureau',
    description: createRichText('Health Resources and Services Administration HIV/AIDS Bureau resources.'),
    externalLink: 'https://hab.hrsa.gov/',
    category: 'federal_websites',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },
  {
    title: 'Target HIV',
    description: createRichText('HRSA Target HIV initiative providing resources and technical assistance.'),
    externalLink: 'https://targethiv.org/',
    category: 'federal_websites',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },
  {
    title: 'HIV.gov',
    description: createRichText('Official U.S. government HIV/AIDS information and resources.'),
    externalLink: 'https://www.hiv.gov/',
    category: 'federal_websites',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },
  {
    title: 'CDC: HIV',
    description: createRichText('Centers for Disease Control and Prevention HIV information and statistics.'),
    externalLink: 'https://www.cdc.gov/hiv/default.html',
    category: 'federal_websites',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },

  // Resources for Providers
  {
    title: 'American Academy of HIV Medicine',
    description: createRichText('Professional organization for HIV healthcare providers and specialists.'),
    externalLink: 'https://aahivm.org/',
    category: 'provider_resources',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },
  {
    title: 'Kaiser Family Foundation: HIV/AIDS',
    description: createRichText('Research, data, and analysis on HIV/AIDS policy and healthcare.'),
    externalLink: 'https://www.kff.org/hivaids/',
    category: 'provider_resources',
    linkType: 'external_link',
    language: 'english',
    status: 'published',
  },
];

async function login() {
  console.log('🔐 Logging in to PayloadCMS...');

  const response = await fetch(`${API_URL}/api/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Login failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  console.log(`✅ Logged in as: ${data.user.email}\n`);
  return data.token;
}

async function createResource(token: string, resource: any) {
  const response = await fetch(`${API_URL}/api/resources`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `JWT ${token}`,
    },
    body: JSON.stringify(resource),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create resource "${resource.title}": ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.doc;
}

async function populateResources() {
  console.log('📋 SHU-212: Populating External Resources\n');
  console.log('━'.repeat(60));

  try {
    const token = await login();

    console.log(`Creating ${resources.length} resources...\n`);

    let created = 0;
    let failed = 0;

    for (const resource of resources) {
      try {
        const doc = await createResource(token, resource);
        console.log(`✅ Created: ${resource.title}`);
        console.log(`   Category: ${resource.category}`);
        console.log(`   Link: ${resource.externalLink}`);
        console.log(`   ID: ${doc.id}\n`);
        created++;
      } catch (error: any) {
        console.error(`❌ Failed: ${resource.title}`);
        console.error(`   Error: ${error.message}\n`);
        failed++;
      }
    }

    console.log('━'.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total: ${resources.length}`);

    if (created > 0) {
      console.log('\n🎉 Resources populated successfully!');
      console.log('   Frontend will rebuild in ~2-3 minutes');
      console.log(`   View at: https://hivconnectcnj.org/resources`);
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

populateResources();
