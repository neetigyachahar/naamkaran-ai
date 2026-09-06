/**
 * MCA / data.gov.in company-name helpers.
 * Filters are exact + case-sensitive; stored names are almost always ALL CAPS.
 */

/** Legal suffixes longest-first so "PRIVATE LIMITED" wins over "LIMITED". */
export const MCA_LEGAL_SUFFIXES = [
  "OPC PRIVATE LIMITED",
  "ONE PERSON COMPANY",
  "PRIVATE LIMITED",
  "PVT. LIMITED",
  "PVT LIMITED",
  "PVT. LTD.",
  "PVT. LTD",
  "PVT LTD.",
  "PVT LTD",
  "PUBLIC LIMITED",
  "LIMITED",
  "LTD.",
  "LTD",
  "LLP",
] as const;

export type McaVariantKind =
  | "bare"
  | "private_limited"
  | "llp"
  | "opc"
  | "limited"
  | "category";

export interface McaNameVariant {
  /** Exact string sent to filters[CompanyName] */
  query: string;
  kind: McaVariantKind;
  label: string;
}

export interface ParsedBrandName {
  /** Original trimmed input */
  input: string;
  /** Core brand without legal suffix, for domains + templates */
  brandName: string;
  /** True when input already included a legal form (e.g. "PAVAN PRIVATE LIMITED") */
  isLegalName: boolean;
  matchedSuffix: string | null;
}

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function parseBrandName(raw: string): ParsedBrandName {
  const input = collapseSpaces(raw);
  const upper = input.toUpperCase();

  for (const suffix of MCA_LEGAL_SUFFIXES) {
    if (upper === suffix) {
      return { input, brandName: input, isLegalName: true, matchedSuffix: suffix };
    }
    const token = ` ${suffix}`;
    if (upper.endsWith(token)) {
      const brandName = collapseSpaces(input.slice(0, input.length - token.length));
      return {
        input,
        brandName: brandName || input,
        isLegalName: true,
        matchedSuffix: suffix,
      };
    }
  }

  return { input, brandName: input, isLegalName: false, matchedSuffix: null };
}

/** Domain / slug form of the brand (no legal junk). */
export function brandNameToDomainSlug(brandName: string): string {
  return brandName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "");
}

/** 1–2 sector-specific ALL CAPS templates (suffix after brand). */
export const MCA_CATEGORY_TEMPLATES: Record<string, string[]> = {
  fintech: ["FINTECH PRIVATE LIMITED", "FINANCIAL SERVICES PRIVATE LIMITED"],
  "e-commerce": ["RETAIL PRIVATE LIMITED", "COMMERCE PRIVATE LIMITED"],
  healthtech: ["HEALTHCARE PRIVATE LIMITED", "HEALTH PRIVATE LIMITED"],
  edtech: ["EDUCATION PRIVATE LIMITED", "LEARNING PRIVATE LIMITED"],
  saas: ["TECHNOLOGIES PRIVATE LIMITED", "SOFTWARE PRIVATE LIMITED"],
  "food & beverage": ["FOODS PRIVATE LIMITED", "HOSPITALITY PRIVATE LIMITED"],
  logistics: ["LOGISTICS PRIVATE LIMITED", "SUPPLY CHAIN PRIVATE LIMITED"],
  "consumer apps": ["DIGITAL PRIVATE LIMITED", "APPS PRIVATE LIMITED"],
};

function toAllCapsBrand(brandName: string): string {
  return collapseSpaces(brandName).toUpperCase();
}

/**
 * Build MCA lookup variants.
 * Legal-form input → single bare query (as typed, uppercased).
 * Brand input → priority forms + optional category templates.
 */
export function buildMcaNameVariants(
  rawName: string,
  category?: string,
): McaNameVariant[] {
  const parsed = parseBrandName(rawName);
  const brand = toAllCapsBrand(parsed.brandName);

  if (parsed.isLegalName) {
    return [
      {
        query: toAllCapsBrand(parsed.input),
        kind: "bare",
        label: "As entered",
      },
    ];
  }

  if (!brand) return [];

  const variants: McaNameVariant[] = [
    { query: brand, kind: "bare", label: "Bare name" },
    {
      query: `${brand} PRIVATE LIMITED`,
      kind: "private_limited",
      label: "Private Limited",
    },
    { query: `${brand} LLP`, kind: "llp", label: "LLP" },
    {
      query: `${brand} OPC PRIVATE LIMITED`,
      kind: "opc",
      label: "OPC Private Limited",
    },
    { query: `${brand} LIMITED`, kind: "limited", label: "Limited" },
  ];

  const categoryKey = category?.trim().toLowerCase() ?? "";
  const extras = MCA_CATEGORY_TEMPLATES[categoryKey] ?? [];
  for (const suffix of extras.slice(0, 2)) {
    variants.push({
      query: `${brand} ${suffix}`,
      kind: "category",
      label: suffix,
    });
  }

  // Dedupe by query
  const seen = new Set<string>();
  return variants.filter((v) => {
    if (seen.has(v.query)) return false;
    seen.add(v.query);
    return true;
  });
}

export const MCA_CHECK_NOTE =
  "Other spellings, casing, or legal forms may still be registered with MCA.";

export const MCA_LEGAL_NAME_HINT =
  "If you enter a full legal name (e.g. PAVAN PRIVATE LIMITED), we check that exact form on MCA and use the brand part (pavan) for domain search.";
