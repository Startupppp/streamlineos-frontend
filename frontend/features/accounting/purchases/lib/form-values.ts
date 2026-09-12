export function textOrNull(value: string | undefined): string | null {
  const next = value?.trim();
  return next && next.length > 0 ? next : null;
}

export function textOrUndefined(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next && next.length > 0 ? next : undefined;
}
