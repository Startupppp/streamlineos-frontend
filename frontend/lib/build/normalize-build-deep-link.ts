function toAbsoluteUrl(raw: string): URL | null {
  try {
    return new URL(raw, "http://local.invalid");
  } catch {
    return null;
  }
}

export function toBuildPath(pathname: string): string {
  if (pathname === "/projects") return "/build/projects";
  if (pathname.startsWith("/projects/"))
    return `/build${pathname.slice("/projects".length)}`;
  return pathname;
}

export function normalizeBuildDeepLink(link: string): string {
  const raw = link.trim();
  if (!raw || /[\p{Cc}\\]/u.test(link) || raw.startsWith("//")) return "/inbox";
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\/[^/]/i.test(raw)) return "/inbox";
  const url = toAbsoluteUrl(raw);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return "/inbox";
  const pathname = toBuildPath(url.pathname);
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return "/inbox";
  return `${pathname}${url.search}`;
}
