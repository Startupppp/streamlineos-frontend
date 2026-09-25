export const KNOWLEDGE_ROOT = "/knowledge";
export const KB_CHAT = `${KNOWLEDGE_ROOT}/chat`;
export const KNOWLEDGE_BASE = `${KNOWLEDGE_ROOT}/wiki`;

export function pageHref(id: number): string {
  return `${KNOWLEDGE_BASE}/doc/${id}`;
}

export function projectPageHref(projectId: number, pageId: number): string {
  return `/build/${projectId}/wiki/${pageId}`;
}

export function pageHistoryHref(id: number): string {
  return `${KNOWLEDGE_BASE}/doc/${id}/history`;
}

export const KB_TRASH = `${KNOWLEDGE_BASE}/trash`;
export const KB_TEMPLATES = `${KNOWLEDGE_BASE}/templates`;
export const KB_ANALYTICS = `${KNOWLEDGE_BASE}/analytics`;
export const KB_PRIVATE = `${KNOWLEDGE_BASE}/private`;
export const KB_SHARED = `${KNOWLEDGE_BASE}/shared`;
export const KB_SPACES = `${KNOWLEDGE_BASE}/spaces`;

export function spaceHref(id: number): string {
  return `${KB_SPACES}/${id}`;
}

export const KB_MANAGE = `${KNOWLEDGE_BASE}/manage`;
export const KB_REVIEWS = `${KNOWLEDGE_BASE}/reviews`;
export const KB_IMPORT = `${KNOWLEDGE_BASE}/import`;
export const KB_SEARCH = `${KNOWLEDGE_BASE}/search`;
