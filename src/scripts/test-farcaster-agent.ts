import { FarcasterAgentJobBody } from '../lib/job';
import { postBulkFarcasterAgentRequest } from '../lib/queue';

export async function testFarcasterAgent() {
  console.log('Testing Farcaster agent...');

  const payload: FarcasterAgentJobBody = {
    agentFid: 883337,
    customInstructions:
      'You are a helpful AI assistant that is replying to a cast that tags you.',
    replyToCastId: 5902631284,
    postToChannelId: null,
  };

  try {
    await postBulkFarcasterAgentRequest([payload]);
    console.log('Successfully sent Farcaster agent request');
  } catch (error) {
    console.error('Failed to send Farcaster agent request:', error);
    throw error;
  }
}
