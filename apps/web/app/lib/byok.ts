const STORAGE_KEY = "naamkaran-gemini-byok";

export function loadByokKey(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && stored.length >= 10 ? stored : null;
}

export function saveByokKey(apiKey: string): void {
  localStorage.setItem(STORAGE_KEY, apiKey);
}

export function clearByokKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}
