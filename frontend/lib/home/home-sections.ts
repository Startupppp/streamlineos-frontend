import type { PermissionKey } from "@/lib/rbac/permissions";

export type HomeSectionAccess =
  | { readonly kind: "universal" }
  | { readonly kind: "module"; readonly module: string }
  | { readonly kind: "permission"; readonly permission: PermissionKey }
  | {
      readonly kind: "module-permission";
      readonly module: string;
      readonly permission: PermissionKey;
    };

export interface HomeSection {
  readonly id: string;
  readonly label: string;
  readonly endpoint: string;
  readonly access: HomeSectionAccess;
}

export const HOME_SECTIONS: readonly HomeSection[] = [
  {
    id: "stats",
    label: "Overview stats",
    endpoint: "/dashboard/stats",
    access: { kind: "universal" },
  },
  {
    id: "personal",
    label: "Personal summary",
    endpoint: "/dashboard/personal",
    access: { kind: "universal" },
  },
  {
    id: "announcements",
    label: "Announcements",
    endpoint: "/dashboard/announcements",
    access: { kind: "universal" },
  },
  {
    id: "my-issues",
    label: "My issues",
    endpoint: "/dashboard/my-issues",
    access: { kind: "module", module: "build" },
  },
  {
    id: "active-sprint",
    label: "Active sprint",
    endpoint: "/dashboard/active-sprint",
    access: { kind: "module", module: "build" },
  },
  {
    id: "recent-projects",
    label: "Recent projects",
    endpoint: "/dashboard/recent-projects",
    access: { kind: "permission", permission: "build:tickets:view" },
  },
  {
    id: "recent-activity",
    label: "Recent activity",
    endpoint: "/dashboard/recent-activity",
    access: { kind: "permission", permission: "build:tickets:view" },
  },
  {
    id: "today-activities",
    label: "Today's activities",
    endpoint: "/dashboard/today-activities",
    access: { kind: "permission", permission: "crm:leads:view" },
  },
  {
    id: "leaves-today",
    label: "Who is out today",
    endpoint: "/dashboard/leaves-today",
    access: { kind: "permission", permission: "hr:leaves:view" },
  },
  {
    id: "pending-approvals",
    label: "Pending approvals",
    endpoint: "/dashboard/pending-approvals",
    access: { kind: "permission", permission: "hr:leaves:approve" },
  },
  {
    id: "team-attendance",
    label: "Team attendance",
    endpoint: "/dashboard/team-attendance",
    access: { kind: "permission", permission: "hr:attendance:view" },
  },
  {
    id: "executive",
    label: "Executive summary",
    endpoint: "/dashboard/executive",
    access: { kind: "permission", permission: "hr:analytics:read" },
  },
  {
    id: "birthdays",
    label: "Birthdays",
    endpoint: "/dashboard/birthdays",
    access: { kind: "module", module: "hr" },
  },
  {
    id: "upcoming-holidays",
    label: "Upcoming holidays",
    endpoint: "/dashboard/upcoming-holidays",
    access: { kind: "module", module: "hr" },
  },
  {
    id: "my-leave-balance",
    label: "My leave balance",
    endpoint: "/dashboard/my-leave-balance",
    access: { kind: "module", module: "hr" },
  },
  {
    id: "public-documents",
    label: "Company documents",
    endpoint: "/hr/documents",
    access: {
      kind: "module-permission",
      module: "hr",
      permission: "hr:documents:view",
    },
  },
];

const BY_ID = new Map(HOME_SECTIONS.map((section) => [section.id, section]));

export function homeSection(id: string): HomeSection {
  const section = BY_ID.get(id);
  if (!section) throw new Error(`Unknown Home section: ${id}`);
  return section;
}

export function homeSectionPermission(id: string): PermissionKey | null {
  const { access } = homeSection(id);
  if (access.kind === "permission" || access.kind === "module-permission")
    return access.permission;
  return null;
}

export function homeSectionModule(id: string): string | null {
  const { access } = homeSection(id);
  if (access.kind === "module" || access.kind === "module-permission")
    return access.module;
  return null;
}
