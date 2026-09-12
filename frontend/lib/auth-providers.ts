export function parseFlag(value: string | undefined): boolean {
  if (value === undefined) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

export const hasGoogleProvider: boolean = parseFlag(
  process.env.NEXT_PUBLIC_GOOGLE_ENABLED,
);
