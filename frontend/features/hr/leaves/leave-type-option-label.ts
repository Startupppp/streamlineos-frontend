/**
 * V-049. The leave-type dropdown rendered the bare `leave_types.name`, so two
 * types carrying different policies were indistinguishable at the moment of
 * choosing. When a policy has its own name, say both.
 * PROVISIONAL: `policyName` is optional until the backend half lands — with
 * nothing sent, or with a policy named after the type, the label is unchanged.
 */
export function leaveTypeOptionLabel(type: {
  name: string;
  policyName?: string | null;
}): string {
  const { name, policyName } = type;
  return policyName && policyName !== name ? `${name} · ${policyName}` : name;
}
