import type { OrganizationPerson } from "@/types/directory/people";

export function getPersonDisplayName(person: OrganizationPerson): string {
  if (person.displayName) return person.displayName;
  return `${person.firstName} ${person.lastName}`.trim();
}

export function getPersonInitials(person: OrganizationPerson): string {
  const displayName = getPersonDisplayName(person);
  const nameParts = displayName.split(" ").filter(Boolean);
  if (nameParts.length >= 2) {
    return `${nameParts[0]?.[0] ?? ""}${nameParts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function formatPersonDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}
