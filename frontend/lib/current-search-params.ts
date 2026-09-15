export function currentSearchParams(
  fallback: URLSearchParams | Readonly<URLSearchParams>,
): URLSearchParams {
  if (typeof window !== "undefined")
    return new URLSearchParams(window.location.search);
  return new URLSearchParams(fallback.toString());
}
