export type RouteSearchParams = Record<string, string | string[] | undefined>;

export function toSearchParams(input: RouteSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) for (const entry of value) params.append(key, entry);
    else params.append(key, value);
  }
  return params;
}
