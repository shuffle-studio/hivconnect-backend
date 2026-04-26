#!/usr/bin/env node
/**
 * SHU-883: Upload HIV Connect documents to Payload CMS
 *
 * Usage:
 *   node scripts/upload-docs.mjs <path-to-docs-folder>
 *
 * Downloads files → uploads to /api/media → creates collection entries.
 * Matches filenames to metadata via the DOCS map below.
 */

import { readdir, readFile } from 'fs/promises';
import { join, basename, extname } from 'path';
import { createInterface } from 'readline';

const BASE_URL = 'https://login.hivconnectcentralnj.com';
const TODAY = new Date().toISOString().split('T')[0];

// Filename pattern → collection entry metadata
const DOCS = [
  {
    match: /universal/i,
    collection: 'service-standards',
    entry: { title: 'Universal/All Provider Service Standards 2026', category: 'core', lastUpdated: TODAY, status: 'published' },
  },
  {
    match: /substance/i,
    collection: 'service-standards',
    entry: { title: 'Substance Use Disorder Treatment Service Standards 2026', category: 'service-delivery', lastUpdated: TODAY, status: 'published' },
  },
  {
    match: /outpatient|ambulatory/i,
    collection: 'service-standards',
    entry: { title: 'Outpatient/Ambulatory Health Services Standards 2026', category: 'service-delivery', lastUpdated: TODAY, status: 'published' },
  },
  {
    match: /outreach/i,
    collection: 'service-standards',
    entry: { title: 'Outreach Service Standard 2026', category: 'core', lastUpdated: TODAY, status: 'published' },
  },
  {
    match: /nutrition|medical.nutrition/i,
    collection: 'service-standards',
    entry: { title: 'Medical Nutrition Therapy Service Standards 2026', category: 'service-delivery', lastUpdated: TODAY, status: 'published' },
  },
  {
    match: /emergency|financial/i,
    collection: 'service-standards',
    entry: { title: 'Emergency Financial Assistance Service Standards 2026', category: 'core', lastUpdated: TODAY, status: 'published' },
  },
  {
    match: /bylaw/i,
    collection: 'bylaws',
    entry: { title: 'PC/CC Approved Updated Bylaws 2025', version: '2025', effectiveDate: '2025-01-01', isCurrent: true, status: 'published' },
  },
];

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim()); }));
}

async function login(email, password) {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) throw new Error(`Login failed: ${data.message || res.status}`);
  return data.token;
}

async function uploadMedia(token, filePath) {
  const filename = basename(filePath);
  const buffer = await readFile(filePath);
  const formData = new FormData();
  formData.append('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), filename);
  formData.append('alt', filename.replace(/[-_]/g, ' ').replace(extname(filename), ''));

  const res = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Media upload failed for ${filename}: ${JSON.stringify(data.errors || data.message)}`);
  return data.doc.id;
}

async function createEntry(token, collection, entry, mediaId) {
  const documentField = collection === 'bylaws' ? 'document' : 'document';
  const res = await fetch(`${BASE_URL}/api/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ ...entry, [documentField]: mediaId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Entry creation failed for ${collection}: ${JSON.stringify(data.errors || data.message)}`);
  return data.doc.id;
}

async function main() {
  const docsDir = process.argv[2];
  if (!docsDir) {
    console.error('Usage: node scripts/upload-docs.mjs <path-to-docs-folder>');
    process.exit(1);
  }

  console.log(`\n📁 Reading files from: ${docsDir}\n`);

  const files = (await readdir(docsDir))
    .filter(f => extname(f).toLowerCase() === '.docx')
    .map(f => join(docsDir, f));

  if (files.length === 0) {
    console.error('No .docx files found in that directory.');
    process.exit(1);
  }

  console.log(`Found ${files.length} file(s):`);
  files.forEach(f => console.log(`  - ${basename(f)}`));
  console.log('');

  const email = await prompt('Payload admin email: ');
  const password = await prompt('Payload admin password: ');

  console.log('\n🔑 Logging in...');
  const token = await login(email, password);
  console.log('✅ Authenticated\n');

  let success = 0;
  let skipped = 0;

  for (const filePath of files) {
    const filename = basename(filePath);
    const meta = DOCS.find(d => d.match.test(filename));

    if (!meta) {
      console.log(`⚠️  Skipped (no metadata match): ${filename}`);
      skipped++;
      continue;
    }

    try {
      process.stdout.write(`📤 Uploading ${filename}... `);
      const mediaId = await uploadMedia(token, filePath);
      process.stdout.write(`media #${mediaId} → `);

      const entryId = await createEntry(token, meta.collection, meta.entry, mediaId);
      console.log(`✅ Created ${meta.collection} entry #${entryId}: "${meta.entry.title}"`);
      success++;
    } catch (err) {
      console.log(`❌ FAILED: ${err.message}`);
    }
  }

  console.log(`\n🎉 Done — ${success} uploaded, ${skipped} skipped.\n`);
  if (success > 0) {
    console.log('The deploy hook will fire automatically. Frontend rebuilds in ~2-3 min.');
    console.log(`Check: ${BASE_URL}/admin to verify entries.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
