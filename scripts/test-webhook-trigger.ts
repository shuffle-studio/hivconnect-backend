/**
 * Test script to trigger auto-rebuild webhook by updating an event
 * This should trigger the frontend rebuild via the deploy hook
 */

const API_URL = 'https://hivconnect-backend.shuffle-seo.workers.dev';

async function testWebhookTrigger() {
  console.log('🧪 Testing Auto-Rebuild Webhook System\n');

  // Step 1: Get existing events
  console.log('1️⃣ Fetching existing events...');
  const listResponse = await fetch(`${API_URL}/api/events?limit=10`);
  const { docs: events } = await listResponse.json();

  if (events.length === 0) {
    console.error('❌ No events found. Please create an event first.');
    process.exit(1);
  }

  const testEvent = events[0];
  console.log(`✅ Found event: "${testEvent.title}" (ID: ${testEvent.id})`);
  console.log(`   Current description preview: ${testEvent.description?.root?.children?.[0]?.children?.[0]?.text?.slice(0, 50) || 'N/A'}...\n`);

  // Step 2: Update the event with a timestamp
  console.log('2️⃣ Updating event to trigger webhook...');
  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'America/New_York',
    dateStyle: 'short',
    timeStyle: 'medium'
  });

  // Add a timestamp to the description to prove the update worked
  const updatedDescription = {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              type: 'text',
              format: 0,
              style: '',
              mode: 'normal',
              detail: 0,
              version: 1,
              text: testEvent.description?.root?.children?.[0]?.children?.[0]?.text || testEvent.description
            }
          ]
        },
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          children: [
            {
              type: 'text',
              format: 1, // bold
              style: '',
              mode: 'normal',
              detail: 0,
              version: 1,
              text: `Last webhook test: ${timestamp}`
            }
          ]
        }
      ]
    }
  };

  const updateResponse = await fetch(`${API_URL}/api/events/${testEvent.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: updatedDescription
    })
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    console.error(`❌ Update failed: ${updateResponse.status} ${updateResponse.statusText}`);
    console.error(error);
    process.exit(1);
  }

  const updatedEvent = await updateResponse.json();
  console.log(`✅ Event updated successfully!`);
  console.log(`   Updated at: ${timestamp}\n`);

  // Step 3: Monitor for webhook trigger
  console.log('3️⃣ Webhook should have triggered...');
  console.log('   Check backend logs for: "🚀 Triggering frontend rebuild..."');
  console.log('   Check Cloudflare Pages for new deployment\n');

  // Step 4: Instructions
  console.log('📋 Next Steps:');
  console.log('   1. Check backend logs: wrangler tail hivconnect-backend --format pretty');
  console.log('   2. Check Cloudflare Pages deployments:');
  console.log('      wrangler pages deployment list --project-name=hivconnect-frontend | head -5');
  console.log('   3. Wait 2-3 minutes for rebuild to complete');
  console.log('   4. Visit event page to verify timestamp appears:\n');
  console.log(`      https://hivconnectcnj.org/events/${testEvent.slug}\n`);

  console.log('✅ Webhook test complete!');
  console.log('   If webhook triggered, you should see a new deployment in ~30 seconds');
}

testWebhookTrigger().catch(console.error);
