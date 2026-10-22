export function leaveTypeOptionLabel(type: {
  name: string;
  policyName?: string | null;
}): string {
  const { name, policyName } = type;
  return policyName && policyName !== name ? `${name} · ${policyName}` : name;
}
