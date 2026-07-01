import type { DomainCheckResult, DomainResult } from "@naamkaran/shared";
import { TLDS } from "../config/tlds";
import { getRdapBaseUrl } from "../lib/rdap-bootstrap";
import { checkWhois } from "../lib/whois-client";

const CONCURRENCY = 5;
const UNKNOWN_WEIGHT_FACTOR = 0.5;

function normalizeDomainName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

async function checkRdap(
  domain: string,
  tld: string,
): Promise<boolean | "unknown" | "error"> {
  const baseUrl = await getRdapBaseUrl(tld);
  if (!baseUrl) return "error";

  const url = `${baseUrl.replace(/\/$/, "")}/domain/${domain}`;
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/rdap+json, application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (response.status === 404) return true;
    if (response.status === 200) return false;
    return "error";
  } catch {
    return "error";
  }
}

async function checkTld(
  name: string,
  tld: string,
  tier: 1 | 2 | 3,
): Promise<DomainResult> {
  const domain = `${name}${tld}`;
  const rdapResult = await checkRdap(domain, tld);

  if (rdapResult === true) {
    return { tld, available: true, source: "rdap", tier };
  }
  if (rdapResult === false) {
    return { tld, available: false, source: "rdap", tier };
  }

  const whoisResult = await checkWhois(domain, tld);
  return { tld, available: whoisResult, source: "whois", tier };
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]!);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function computeDomainScore(results: DomainResult[]): number {
  let earned = 0;
  let total = 0;

  for (const result of results) {
    const config = TLDS.find((t) => t.tld === result.tld);
    const weight = config?.weight ?? 1;
    total += weight;

    if (result.available === true) {
      earned += weight;
    } else if (result.available === "unknown") {
      earned += weight * UNKNOWN_WEIGHT_FACTOR;
    }
  }

  if (total === 0) return 0;
  return Math.round((earned / total) * 100);
}

export async function domainCheck(name: string): Promise<DomainCheckResult> {
  const normalized = normalizeDomainName(name);
  if (!normalized) {
    return { score: 0, results: [] };
  }

  const results = await runWithConcurrency(TLDS, CONCURRENCY, (config) =>
    checkTld(normalized, config.tld, config.tier),
  );

  return {
    score: computeDomainScore(results),
    results,
  };
}
