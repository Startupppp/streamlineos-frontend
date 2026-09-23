function toAbsoluteUrl(raw: string): URL | null {
  try {
    return new URL(raw, "http://local.invalid");
  } catch {
    return null;
  }
}

export function toBuildPath(pathname: string): string {
  if (pathname === "/projects" || pathname.startsWith("/projects/"))
    return `/build${pathname.slice("/projects".length)}`;
  return pathname;
}

export function normalizeBuildDeepLink(link: string): string {
  const url = toAbsoluteUrl(link);
  if (!url) return link;
  return `${toBuildPath(url.pathname)}${url.search}`;
}
