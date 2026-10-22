export function resolveSessionIsActive(
  fresh: { isActive: boolean } | null | undefined,
  tokenIsActive: unknown,
): boolean {
  if (fresh) return fresh.isActive;
  return typeof tokenIsActive === "boolean" ? tokenIsActive : true;
}
