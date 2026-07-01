import type { McaMatch, RegistrationResult } from "@naamkaran/shared";
import {
  COMPANY_MASTER_DATA_RESOURCE_ID,
  TRADEMARK_SEARCH_BASE_URL,
} from "../config/tlds";

interface DataGovRecord {
  company_name?: string;
  COMPANY_NAME?: string;
  cin?: string;
  CIN?: string;
  corporate_identification_number?: string;
  CORPORATEIDENTIFICATIONNUMBER?: string;
  company_status?: string;
  COMPANY_STATUS?: string;
  status?: string;
}

interface DataGovResponse {
  records?: DataGovRecord[];
  data?: DataGovRecord[];
}

function getField(record: DataGovRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key as keyof DataGovRecord];
    if (value != null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toMcaMatch(record: DataGovRecord): McaMatch {
  return {
    companyName:
      getField(record, "company_name", "COMPANY_NAME") || "Unknown",
    cin: getField(
      record,
      "cin",
      "CIN",
      "corporate_identification_number",
      "CORPORATEIDENTIFICATIONNUMBER",
    ),
    status: getField(record, "company_status", "COMPANY_STATUS", "status") || "Unknown",
  };
}

function classifyMatches(
  searchName: string,
  records: DataGovRecord[],
): { exact: McaMatch[]; partial: McaMatch[] } {
  const normalizedSearch = normalizeCompanyName(searchName);
  const exact: McaMatch[] = [];
  const partial: McaMatch[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    const match = toMcaMatch(record);
    if (!match.companyName || seen.has(match.cin || match.companyName)) continue;
    seen.add(match.cin || match.companyName);

    const normalizedCompany = normalizeCompanyName(match.companyName);
    if (normalizedCompany === normalizedSearch) {
      exact.push(match);
    } else if (
      normalizedCompany.includes(normalizedSearch) ||
      normalizedSearch.includes(normalizedCompany)
    ) {
      partial.push(match);
    }
  }

  return { exact, partial };
}

function computeRegistrationScore(exactCount: number, partialCount: number): number {
  const score = 100 - exactCount * 40 - partialCount * 15;
  return Math.max(0, Math.round(score));
}

function buildTrademarkSearchUrl(name: string): string {
  const encoded = encodeURIComponent(name.trim());
  return `${TRADEMARK_SEARCH_BASE_URL}?wordmark=${encoded}`;
}

async function fetchMcaRecords(
  name: string,
  apiKey: string,
): Promise<DataGovRecord[]> {
  const filterFields = ["company_name", "COMPANY_NAME"];
  const allRecords: DataGovRecord[] = [];

  for (const field of filterFields) {
    const url = new URL(
      `https://api.data.gov.in/resource/${COMPANY_MASTER_DATA_RESOURCE_ID}`,
    );
    url.searchParams.set("api-key", apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "50");
    url.searchParams.set(`filters[${field}]`, name);

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) continue;

    const data = (await response.json()) as DataGovResponse;
    const records = data.records ?? data.data ?? [];
    allRecords.push(...records);
  }

  if (allRecords.length > 0) {
    return allRecords;
  }

  const fallbackUrl = new URL(
    `https://api.data.gov.in/resource/${COMPANY_MASTER_DATA_RESOURCE_ID}`,
  );
  fallbackUrl.searchParams.set("api-key", apiKey);
  fallbackUrl.searchParams.set("format", "json");
  fallbackUrl.searchParams.set("limit", "100");
  fallbackUrl.searchParams.set("q", name);

  const fallbackResponse = await fetch(fallbackUrl.toString(), {
    signal: AbortSignal.timeout(15_000),
  });

  if (!fallbackResponse.ok) {
    return [];
  }

  const fallbackData = (await fallbackResponse.json()) as DataGovResponse;
  return fallbackData.records ?? fallbackData.data ?? [];
}

export async function registrationCheck(
  name: string,
  apiKey: string,
): Promise<RegistrationResult> {
  const records = await fetchMcaRecords(name, apiKey);
  const { exact, partial } = classifyMatches(name, records);
  const mcaMatches = [...exact, ...partial];

  return {
    score: computeRegistrationScore(exact.length, partial.length),
    mcaMatches,
    trademarkSearchUrl: buildTrademarkSearchUrl(name),
  };
}

export function disabledRegistrationResult(name: string): RegistrationResult {
  return {
    score: 0,
    mcaMatches: [],
    trademarkSearchUrl: buildTrademarkSearchUrl(name),
    disabled: true,
  };
}
