const STORAGE_KEY = "naamkaran-deep-brand-search";

export function loadDeepBrandSearch(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function saveDeepBrandSearch(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(STORAGE_KEY, "true");
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function clearDeepBrandSearch(): void {
  localStorage.removeItem(STORAGE_KEY);
}
