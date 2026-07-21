export interface NamedUser {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export function getUserDisplayName(user: NamedUser | null | undefined): string {
  if (!user) return "Unassigned";
  if (user.name && user.name.trim()) return user.name.trim();
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (full) return full;
  const email = user.email?.trim();
  if (!email) return "Unknown";
  const local = email.split("@")[0]?.trim();
  return local || email;
}

export function getUserInitials(user: NamedUser | null | undefined): string {
  if (!user) return "?";
  const first = user.firstName?.trim()?.[0] ?? "";
  const last = user.lastName?.trim()?.[0] ?? "";
  if (first || last) return `${first}${last}`.toUpperCase();
  const parts = getUserDisplayName(user).split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (`${a}${b}`.trim() || "?").toUpperCase();
}
