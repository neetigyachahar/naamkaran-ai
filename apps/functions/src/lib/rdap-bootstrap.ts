const IANA_RDAP_DNS_URL = "https://data.iana.org/rdap/dns.json";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface IanaRdapBootstrap {
  services: [string[], string[]][];
}

let cachedMap: Map<string, string> | null = null;
let cachedAt = 0;

function buildMap(data: IanaRdapBootstrap): Map<string, string> {
  const map = new Map<string, string>();
  for (const [tlds, urls] of data.services) {
    const baseUrl = urls[0];
    if (!baseUrl) continue;
    for (const tld of tlds) {
      map.set(tld.toLowerCase(), baseUrl);
    }
  }
  return map;
}

async function fetchBootstrap(): Promise<Map<string, string>> {
  const response = await fetch(IANA_RDAP_DNS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch IANA RDAP bootstrap: ${response.status}`);
  }
  const data = (await response.json()) as IanaRdapBootstrap;
  return buildMap(data);
}

export async function getRdapBaseUrl(tld: string): Promise<string | null> {
  const normalized = tld.replace(/^\./, "").toLowerCase();
  const now = Date.now();

  if (!cachedMap || now - cachedAt > CACHE_TTL_MS) {
    cachedMap = await fetchBootstrap();
    cachedAt = now;
  }

  if (cachedMap.has(normalized)) {
    return cachedMap.get(normalized) ?? null;
  }

  const parts = normalized.split(".");
  for (let i = 1; i < parts.length; i++) {
    const suffix = parts.slice(i).join(".");
    if (cachedMap.has(suffix)) {
      return cachedMap.get(suffix) ?? null;
    }
  }

  return null;
}
