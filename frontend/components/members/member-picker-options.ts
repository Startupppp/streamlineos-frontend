import { getUserDisplayName, type NamedUser } from "@/lib/person-display";

export interface MemberOption extends NamedUser {
  id: string;
  email: string;
  image: string | null;
  description?: string | null;
  moduleAccessRevoked?: boolean;
}

export function filterMembers(
  members: MemberOption[],
  search: string,
  serverFiltered: boolean,
  excludeUserId?: string,
  excludeUserIds?: string[],
) {
  const excludeSet = new Set<string>(excludeUserIds ?? []);
  if (excludeUserId) excludeSet.add(excludeUserId);
  const eligible =
    excludeSet.size > 0
      ? members.filter((m) => !excludeSet.has(m.id))
      : members;
  if (serverFiltered || !search.trim()) return eligible;
  const q = search.toLowerCase();
  return eligible.filter(
    (m) =>
      getUserDisplayName(m).toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q),
  );
}
