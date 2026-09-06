import type { McaMatch, McaVariantResult, RegistrationResult } from "@naamkaran/shared";
import {
  MCA_CHECK_NOTE,
  buildMcaNameVariants,
  parseBrandName,
} from "@naamkaran/shared";
import {
  COMPANY_MASTER_DATA_RESOURCE_ID,
  TRADEMARK_SEARCH_BASE_URL,
} from "../config/tlds";

interface DataGovRecord {
  CompanyName?: string;
  CIN?: string;
  CompanyStatus?: string;
  company_name?: string;
  COMPANY_NAME?: string;
  cin?: string;
  status?: string;
}

interface DataGovResponse {
  records?: DataGovRecord[];
  data?: DataGovRecord[];
  count?: number | string;
  total?: number | string;
  status?: string;
}

const REQUEST_GAP_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildTrademarkSearchUrl(name: string): string {
  const encoded = encodeURIComponent(name.trim());
  return `${TRADEMARK_SEARCH_BASE_URL}?wordmark=${encoded}`;
}

function recordCompanyName(record: DataGovRecord): string {
  return (
    record.CompanyName ||
    record.company_name ||
    record.COMPANY_NAME ||
    ""
  ).trim();
}

function recordCin(record: DataGovRecord): string {
  return (record.CIN || record.cin || "").trim();
}

function recordStatus(record: DataGovRecord): string {
  return (record.CompanyStatus || record.status || "Unknown").trim();
}

function toMcaMatch(record: DataGovRecord): McaMatch | null {
  const companyName = recordCompanyName(record);
  if (!companyName) return null;
  return {
    companyName,
    cin: recordCin(record),
    status: recordStatus(record),
  };
}

/**
 * Exact match on CompanyName (ALL CAPS queries). Same RoC company-master
 * resource also holds many LLP rows — there is no separate searchable LLP
 * master API on data.gov.in for name lookup.
 */
async function lookupExactCompanyName(
  query: string,
  apiKey: string,
): Promise<{ available: boolean | "unknown"; match?: McaMatch }> {
  const url = new URL(
    `https://api.data.gov.in/resource/${COMPANY_MASTER_DATA_RESOURCE_ID}`,
  );
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "10");
  url.searchParams.set("filters[CompanyName]", query);

  try {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return { available: "unknown" };
    }

    const data = (await response.json()) as DataGovResponse;
    const records = data.records ?? data.data ?? [];
    if (records.length === 0) {
      return { available: true };
    }

    const match = toMcaMatch(records[0]!);
    return match
      ? { available: false, match }
      : { available: false };
  } catch {
    return { available: "unknown" };
  }
}

function computeRegistrationScore(variants: McaVariantResult[]): number {
  if (variants.length === 0) return 50;
  let weightSum = 0;
  let earned = 0;
  for (const variant of variants) {
    const weight =
      variant.kind === "private_limited" || variant.kind === "bare"
        ? 2
        : variant.kind === "limited"
          ? 0.5
          : 1;
    weightSum += weight;
    if (variant.available === true) earned += weight;
    else if (variant.available === "unknown") earned += weight * 0.4;
  }
  return Math.round((earned / weightSum) * 100);
}

export async function registrationCheck(
  name: string,
  apiKey: string,
  category?: string,
): Promise<RegistrationResult> {
  const parsed = parseBrandName(name);
  const variantSpecs = buildMcaNameVariants(name, category);
  const variants: McaVariantResult[] = [];
  const mcaMatches: McaMatch[] = [];

  for (let i = 0; i < variantSpecs.length; i++) {
    const spec = variantSpecs[i]!;
    if (i > 0) await sleep(REQUEST_GAP_MS);

    const result = await lookupExactCompanyName(spec.query, apiKey);
    const row: McaVariantResult = {
      query: spec.query,
      kind: spec.kind,
      label: spec.label,
      available: result.available,
      companyName: result.match?.companyName,
      cin: result.match?.cin,
      status: result.match?.status,
    };
    variants.push(row);
    if (result.match) mcaMatches.push(result.match);
  }

  return {
    score: computeRegistrationScore(variants),
    mcaMatches,
    variants,
    trademarkSearchUrl: buildTrademarkSearchUrl(parsed.brandName),
    note: MCA_CHECK_NOTE,
    brandName: parsed.brandName,
    isLegalName: parsed.isLegalName,
  };
}

export function disabledRegistrationResult(name: string): RegistrationResult {
  const parsed = parseBrandName(name);
  return {
    score: 0,
    mcaMatches: [],
    variants: [],
    trademarkSearchUrl: buildTrademarkSearchUrl(parsed.brandName),
    brandName: parsed.brandName,
    isLegalName: parsed.isLegalName,
    disabled: true,
  };
}
