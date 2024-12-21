import { StagingFarcasterCast } from '../types/types';
import { DR_GONZO_FID } from './agent-config';

// Helper function to check if root parent URL is valid
export const isValidRootParentUrl = (rootParentUrl: string | null) => {
  const validUrls = [
    'https://warpcast.com/~/channel/vrbs',
    'chain://eip155:1/erc721:0x9c8ff314c9bc7f6e59a9d9225fb22946427edc03',
    'chain://eip155:1/erc721:0x558bfff0d583416f7c4e380625c7865821b8e95c',
    'https://warpcast.com/~/channel/flows',
  ];
  return !!(rootParentUrl && validUrls.includes(rootParentUrl));
};

// Filter function for casts
export const filterCasts = (
  row: StagingFarcasterCast,
  nounishFids: Set<number>
) => {
  const fid = Number(row.fid);
  return isValidRootParentUrl(row.root_parent_url) || nounishFids.has(fid);
};

export const filterCastsForAgent = (row: StagingFarcasterCast) => {
  const mentionedFids = row.mentions || [];
  return mentionedFids.includes(DR_GONZO_FID);
};
