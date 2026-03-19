const STORAGE_KEY = "elara-recent-searches";
const MAX_RECENT = 8;

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string) {
  const q = query.trim();
  if (q.length < 2) return;
  const existing = getRecentSearches().filter(s => s.toLowerCase() !== q.toLowerCase());
  const updated = [q, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearRecentSearches() {
  localStorage.removeItem(STORAGE_KEY);
}
