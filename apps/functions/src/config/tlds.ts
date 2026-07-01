import { REGISTRATION_CHECK_ENABLED } from "./features";

export type TldTier = 1 | 2 | 3;

export interface TldConfig {
  tld: string;
  tier: TldTier;
  weight: number;
}

export const TLD_TIER_WEIGHTS: Record<TldTier, number> = {
  1: 3,
  2: 2,
  3: 1,
};

export const TLDS: TldConfig[] = [
  { tld: ".com", tier: 1, weight: TLD_TIER_WEIGHTS[1] },
  { tld: ".in", tier: 1, weight: TLD_TIER_WEIGHTS[1] },
  { tld: ".co.in", tier: 1, weight: TLD_TIER_WEIGHTS[1] },
  { tld: ".co", tier: 2, weight: TLD_TIER_WEIGHTS[2] },
  { tld: ".io", tier: 2, weight: TLD_TIER_WEIGHTS[2] },
  { tld: ".ai", tier: 2, weight: TLD_TIER_WEIGHTS[2] },
  { tld: ".net", tier: 2, weight: TLD_TIER_WEIGHTS[2] },
  { tld: ".org", tier: 2, weight: TLD_TIER_WEIGHTS[2] },
  { tld: ".app", tier: 3, weight: TLD_TIER_WEIGHTS[3] },
  { tld: ".shop", tier: 3, weight: TLD_TIER_WEIGHTS[3] },
  { tld: ".store", tier: 3, weight: TLD_TIER_WEIGHTS[3] },
];

export const SCORE_WEIGHTS = {
  domain: 0.35,
  seo: 0.35,
  registration: 0.3,
} as const;

export const ACTIVE_SCORE_WEIGHTS = REGISTRATION_CHECK_ENABLED
  ? SCORE_WEIGHTS
  : { domain: 0.5, seo: 0.5, registration: 0 };

export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const COMPANY_MASTER_DATA_RESOURCE_ID =
  "4dbe5667-7b6b-41d7-82af-211562424d9a";

export const TRADEMARK_SEARCH_BASE_URL =
  "https://tmrsearch.ipindia.gov.in/ESEARCH";
