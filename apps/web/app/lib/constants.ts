export const CATEGORIES = [
  { value: "", label: "Any category" },
  { value: "fintech", label: "Fintech" },
  { value: "e-commerce", label: "E-commerce" },
  { value: "healthtech", label: "Healthtech" },
  { value: "edtech", label: "Edtech" },
  { value: "saas", label: "SaaS / B2B software" },
  { value: "food & beverage", label: "Food & beverage" },
  { value: "logistics", label: "Logistics" },
  { value: "consumer apps", label: "Consumer apps" },
] as const;

export function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-rose-600";
}

export function scoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-50 border-emerald-200";
  if (score >= 40) return "bg-amber-50 border-amber-200";
  return "bg-rose-50 border-rose-200";
}

export function scoreLabel(score: number): string {
  if (score >= 70) return "Strong viability";
  if (score >= 40) return "Mixed signals";
  return "High risk";
}

export function availabilityLabel(available: boolean | "unknown"): string {
  if (available === true) return "Available";
  if (available === false) return "Taken";
  return "Unknown";
}

export function availabilityClass(available: boolean | "unknown"): string {
  if (available === true) return "text-emerald-700 bg-emerald-50";
  if (available === false) return "text-rose-700 bg-rose-50";
  return "text-gray-600 bg-gray-100";
}
