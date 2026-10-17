export interface PersonSummary {
  userId: string;
  name: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  image?: string | null;
  employeeId?: string | null;
  designation?: string | null;
  departmentName?: string | null;
  isActive?: boolean;
  hasAccepted?: boolean;
  reportingToName?: string | null;
}

export interface PersonDrawerException {
  id: string;
  label: string;
  detail: string;
  href: string;
}

export type PersonDrawerSectionKey =
  | "overview"
  | "employment"
  | "time"
  | "pay"
  | "docs";

export const PERSON_DRAWER_SECTIONS: readonly {
  key: PersonDrawerSectionKey;
  label: string;
}[] = [
  { key: "overview", label: "Overview" },
  { key: "employment", label: "Employment" },
  { key: "time", label: "Time" },
  { key: "pay", label: "Pay" },
  { key: "docs", label: "Docs" },
];

export function personStatusLabel(person: PersonSummary): string {
  if (person.isActive === false) return "Inactive";
  if (person.hasAccepted === false) return "Pending invite";
  return "Active";
}
