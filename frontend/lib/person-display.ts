export interface NamedUser {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

const WHITESPACE_RUN = /(?:\s|\u00a0|\u200b|\u200c|\u200d|\u2060|\ufeff)+/gu;

export function normalizeNamePart(value: string | null | undefined): string {
  return (value ?? "").replace(WHITESPACE_RUN, " ").trim();
}

export function getUserDisplayName(user: NamedUser | null | undefined): string {
  if (!user) return "Unassigned";
  const accountName = normalizeNamePart(user.name);
  if (accountName) return accountName;

  const first = normalizeNamePart(user.firstName);
  const last = normalizeNamePart(user.lastName);
  if (first && last) return `${first} ${last}`;
  if (first || last) return first || last;

  const email = normalizeNamePart(user.email);
  if (!email) return "Unknown";
  const local = normalizeNamePart(email.split("@")[0]);
  return local || email;
}

export function getUserInitials(user: NamedUser | null | undefined): string {
  if (!user) return "?";
  const first = normalizeNamePart(user.firstName)[0] ?? "";
  const last = normalizeNamePart(user.lastName)[0] ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  const parts = getUserDisplayName(user).split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (`${a}${b}`.trim() || "?").toUpperCase();
}
