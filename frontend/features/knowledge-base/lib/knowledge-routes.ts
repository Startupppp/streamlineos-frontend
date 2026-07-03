export const KNOWLEDGE_BASE = "/knowledge";

export function pageHref(id: number): string {
  return `${KNOWLEDGE_BASE}/pages/${id}`;
}

export function pageHistoryHref(id: number): string {
  return `${KNOWLEDGE_BASE}/pages/${id}/history`;
}

export const KB_RECENT = `${KNOWLEDGE_BASE}/recent`;
export const KB_FAVORITES = `${KNOWLEDGE_BASE}/favorites`;
export const KB_TRASH = `${KNOWLEDGE_BASE}/trash`;
export const KB_TEMPLATES = `${KNOWLEDGE_BASE}/templates`;
export const KB_ANALYTICS = `${KNOWLEDGE_BASE}/analytics`;
export const KB_PRIVATE = `${KNOWLEDGE_BASE}/private`;
export const KB_SHARED = `${KNOWLEDGE_BASE}/shared`;
export const KB_SPACES = `${KNOWLEDGE_BASE}/spaces`;

export function spaceHref(id: number): string {
  return `${KB_SPACES}/${id}`;
}

export const KB_REVIEWS = `${KNOWLEDGE_BASE}/reviews`;
export const KB_SETTINGS = `${KNOWLEDGE_BASE}/settings`;
export const KB_IMPORT = `${KNOWLEDGE_BASE}/import`;
