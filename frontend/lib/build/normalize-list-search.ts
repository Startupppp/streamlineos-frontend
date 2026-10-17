export const LIST_SEARCH_MAX = 200;

export function normalizeListSearch(raw: string): string {
  return raw.trim().slice(0, LIST_SEARCH_MAX);
}
