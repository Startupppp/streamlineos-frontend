export const LAST_PROJECT_COOKIE_NAME = "last-project-id";
export const LAST_PROJECT_CHANGED_EVENT = "lastProjectIdChanged";

const COOKIE_MAX_AGE = 31536000;

export function parseLastProjectId(raw: string | undefined): number | null {
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export function setLastProjectId(projectId: string | number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LAST_PROJECT_COOKIE_NAME}=${String(projectId)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  window.dispatchEvent(new Event(LAST_PROJECT_CHANGED_EVENT));
}

export function clearLastProjectId(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${LAST_PROJECT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  window.dispatchEvent(new Event(LAST_PROJECT_CHANGED_EVENT));
}
