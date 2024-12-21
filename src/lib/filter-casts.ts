import { Grant, StagingFarcasterCast } from '../types/types';
import { DR_GONZO_FID } from './agent-config';
import { getFidToVerifiedAddresses, getGrants } from './download-csvs';

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
export const filterCastsToEmbed = (
  row: StagingFarcasterCast,
  nounishFids: Set<number>
) => {
  const fid = Number(row.fid);
  return (
    (isValidRootParentUrl(row.root_parent_url) || nounishFids.has(fid)) &&
    row.parent_hash === null
  );
};

export const filterCastsForAgent = (row: StagingFarcasterCast) => {
  if (row.fid === '238425') {
    console.log({ row });
  }
  const mentionedFids = row.mentions || [];
  return mentionedFids.includes(DR_GONZO_FID);
};

export function getFilteredRowsWithGrantData(
  rows: StagingFarcasterCast[]
): StagingFarcasterCast[] {
  const grants = getGrants();
  const profiles = getFidToVerifiedAddresses();

  return rows
    .map((row) => {
      const result = filterGrantRecipients(row, profiles, grants);
      if (!result.isValid) return null;
      return row;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function filterGrantRecipients(
  cast: StagingFarcasterCast,
  profiles: Map<string, string[]>,
  grants: Grant[]
): { isValid: boolean } {
  // Get profile for this cast's FID
  const verifiedAddresses = profiles.get(cast.fid.toString());

  if (!verifiedAddresses) {
    console.error(`No profile found for FID ${cast.fid}`);
  }

  if (!verifiedAddresses || verifiedAddresses.length === 0) {
    return { isValid: false };
  }

  // Handle case where verified_addresses is a string instead of array
  const addresses = Array.isArray(verifiedAddresses)
    ? verifiedAddresses
    : [verifiedAddresses];

  // Find all matching grants for this profile's addresses
  const matchingGrants = grants.filter((grant) =>
    addresses.some(
      (address) => address.toLowerCase() === grant.recipient.toLowerCase()
    )
  );

  if (matchingGrants.length === 0) {
    return { isValid: false };
  }

  return {
    isValid: true,
  };
}
