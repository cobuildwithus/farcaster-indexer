import { FarcasterAgentJobBody } from './job';
import { postBulkFarcasterAgentRequest } from './queue';
import { StagingFarcasterCast } from '../types/types';
import { DR_GONZO_FID } from './agent-config';

export async function queueAgentRequests(casts: StagingFarcasterCast[]) {
  const payloads: FarcasterAgentJobBody[] = [];

  for (const cast of casts) {
    const mentionedFids = JSON.parse(cast.mentions);
    if (!mentionedFids.includes(DR_GONZO_FID)) {
      throw new Error(`Cast ${cast.id} does not mention DR Gonzo. Skipping.`);
    }

    const payload: FarcasterAgentJobBody = {
      agentFid: DR_GONZO_FID,
      customInstructions:
        'You are a helpful AI assistant that is replying to a cast that tags you.',
      replyToCastId: cast.id,
      postToChannelId: null,
    };

    payloads.push(payload);
  }

  const BATCH_SIZE = 10;
  // Send payloads in batches
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    await postBulkFarcasterAgentRequest(batch);
    console.log(
      `Successfully queued agent requests for batch of ${batch.length} casts (offset: ${i})`
    );
  }
}
