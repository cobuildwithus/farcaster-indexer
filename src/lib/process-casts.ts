import { Client } from 'pg';
import { IngestionType } from './s3';
import { embedStagingCasts } from './embedding/embed-casts';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { NounishCitizen, Grant, StagingFarcasterCast } from '../types/types';
import { checkGrantUpdates } from './is-grant-update';
import { getFidToFname, getFidToVerifiedAddresses } from './download-csvs';
import { queueAgentRequests } from './queue-agent-requests';
import {
  filterCastsForAgent,
  filterCastsToEmbed,
  getFilteredRowsWithGrantData,
} from './filter-casts';

// Function to process casts after migration
export async function processCastsFromStagingTable(
  type: IngestionType,
  client: Client
) {
  const fidToFname = getFidToFname();
  const fidToVerifiedAddresses = getFidToVerifiedAddresses();

  if (type === 'casts') {
    // Read and parse nounish citizens CSV
    const csvPath = path.resolve(__dirname, '../data/nounish-citizens.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const nounishCitizens: NounishCitizen[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Create set of nounish citizen FIDs for faster lookups
    const nounishFids = new Set(nounishCitizens.map((row) => Number(row.fid)));

    const batchSize = 10000;
    let offset = 0;
    let hasMore = true;

    console.log('Processing casts from staging table');

    while (hasMore) {
      const res = await client.query<
        StagingFarcasterCast & { author_fname: string }
      >(
        `SELECT c.*, p.fname as author_fname 
         FROM staging.farcaster_casts c
         LEFT JOIN production.farcaster_profile p ON c.fid = p.fid
         ORDER BY c.id LIMIT $1 OFFSET $2`,
        [batchSize, offset]
      );

      const rows = res.rows;
      hasMore = rows.length > 0;

      if (rows.length === 0) {
        offset += batchSize;
        continue;
      }

      console.log(
        `Processing batch of ${rows.length} casts (offset: ${offset})`
      );

      const embeddingRows = rows.filter((row) =>
        filterCastsToEmbed(row, nounishFids)
      );

      if (embeddingRows.length > 0) {
        console.log(
          `Embedding batch of ${embeddingRows.length} casts (offset: ${offset}, non-filtered: ${rows.length})`
        );
        await embedStagingCasts(
          embeddingRows,
          fidToFname,
          fidToVerifiedAddresses
        );
        console.log(
          `Successfully embedded batch of ${embeddingRows.length} casts (offset: ${offset}, non-filtered: ${rows.length})`
        );
      }

      const filteredRowsWithGrantData = getFilteredRowsWithGrantData(rows);

      if (filteredRowsWithGrantData.length > 0) {
        console.log(
          `Checking grant updates for batch of ${filteredRowsWithGrantData.length} casts (offset: ${offset})`
        );
        await checkGrantUpdates(filteredRowsWithGrantData, fidToFname);
        console.log(
          `Successfully checked grant updates for batch of ${filteredRowsWithGrantData.length} casts (offset: ${offset})`
        );
      }

      const filteredRowsForAgent = rows.filter((row) =>
        filterCastsForAgent(row)
      );

      if (filteredRowsForAgent.length > 0) {
        console.log(
          `Filtering for agent for batch of ${filteredRowsForAgent.length} casts (offset: ${offset})`
        );
        console.log({ filteredRowsForAgent });
        await queueAgentRequests(filteredRowsForAgent);
        console.log(
          `Successfully queued agent requests for batch of ${filteredRowsForAgent.length} casts (offset: ${offset})`
        );
      }

      offset += batchSize;
    }
  }
}
