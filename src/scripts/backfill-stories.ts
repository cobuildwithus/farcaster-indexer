import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { Grant } from '../types/types';
import { StoryJobBody } from '../lib/job';
import { postBulkStoryRequest } from '../lib/queue';
import { downloadGrants } from '../crons/download-grants';

export async function backfillStories() {
  console.log('Starting story backfill...');

  await downloadGrants();

  // Read grants CSV
  const csvPath = path.resolve(__dirname, '../data/grants.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const grants: Grant[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log(`Found ${grants.length} grants to process`);

  const payloads: StoryJobBody[] = [];

  for (const grant of grants) {
    const payload: StoryJobBody = {
      newCastId: 10,
      grantId:
        '0xc7ac83194f84c5ae2ef687e62f6999aba377a7c882919f1b3b1cb1bb0e25d40e',
    };

    payloads.push(payload);
  }

  console.log(`Created ${payloads.length} story payloads`);

  // Process in batches of 100
  const batchSize = 1;
  for (let i = 0; i < payloads.length; i += batchSize) {
    const batch = payloads.slice(i, i + batchSize);
    await postBulkStoryRequest(batch);
    console.log(
      `Processed batch ${i / batchSize + 1} of ${Math.ceil(
        payloads.length / batchSize
      )}`
    );
    throw new Error('Stopping');
  }

  console.log('Story backfill complete!');
}
