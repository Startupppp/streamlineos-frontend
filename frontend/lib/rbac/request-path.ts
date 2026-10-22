interface HeaderReader {
  get(name: string): string | null;
}

function pathnameFrom(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value, "https://streamlineos.local");
    return url.pathname.startsWith("/") ? url.pathname : null;
  } catch {
    return null;
  }
}

export function resolveRequestPath(headers: HeaderReader): string | null {
  return (
    pathnameFrom(headers.get("x-pathname")) ??
    pathnameFrom(headers.get("next-url")) ??
    pathnameFrom(headers.get("x-invoke-path")) ??
    pathnameFrom(headers.get("referer"))
  );
}
