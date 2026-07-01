import * as net from "node:net";

const WHOIS_SERVERS: Record<string, string> = {
  com: "whois.verisign-grs.com",
  net: "whois.verisign-grs.com",
  org: "whois.pir.org",
  in: "whois.registry.in",
  "co.in": "whois.registry.in",
  co: "whois.nic.co",
  io: "whois.nic.io",
  ai: "whois.nic.ai",
  app: "whois.nic.google",
  shop: "whois.nic.shop",
  store: "whois.nic.store",
};

const AVAILABLE_PATTERNS = [
  /no match/i,
  /not found/i,
  /no data found/i,
  /no entries found/i,
  /status:\s*free/i,
  /domain not found/i,
  /nothing found/i,
];

const TAKEN_PATTERNS = [
  /domain name:/i,
  /registrant/i,
  /creation date:/i,
  /registered on/i,
  /registry domain id:/i,
];

export function getWhoisServer(tld: string): string | null {
  const normalized = tld.replace(/^\./, "").toLowerCase();
  return WHOIS_SERVERS[normalized] ?? null;
}

function queryWhois(server: string, domain: string, timeoutMs = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    const socket = net.createConnection({ host: server, port: 43 }, () => {
      socket.write(`${domain}\r\n`);
    });

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`WHOIS timeout for ${domain}`));
    }, timeoutMs);

    socket.on("data", (chunk) => {
      data += chunk.toString("utf8");
    });

    socket.on("end", () => {
      clearTimeout(timer);
      resolve(data);
    });

    socket.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function parseWhoisResponse(response: string): boolean | "unknown" {
  const lower = response.toLowerCase();
  if (AVAILABLE_PATTERNS.some((p) => p.test(lower))) {
    return true;
  }
  if (TAKEN_PATTERNS.some((p) => p.test(lower))) {
    return false;
  }
  return "unknown";
}

export async function checkWhois(
  domain: string,
  tld: string,
): Promise<boolean | "unknown"> {
  const server = getWhoisServer(tld);
  if (!server) return "unknown";

  try {
    const response = await queryWhois(server, domain);
    return parseWhoisResponse(response);
  } catch {
    return "unknown";
  }
}
