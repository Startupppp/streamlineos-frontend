import type { PermissionKey } from "@/lib/rbac/permissions";
import manifest from "./home-manifest.generated.json";

type ManifestSection = (typeof manifest.sections)[number];

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

function accessFromManifest(entry: ManifestSection): HomeSectionAccess {
  if (entry.module && entry.permission)
    return {
      kind: "module-permission",
      module: entry.module,
      permission: entry.permission as PermissionKey,
    };
  if (entry.module)
    return { kind: "module", module: entry.module };
  if (entry.permission)
    return { kind: "permission", permission: entry.permission as PermissionKey };
  return { kind: "universal" };
}

const MANIFEST_BY_ENDPOINT = new Map<string, ManifestSection>(
  manifest.sections.map((s) => [s.endpoint, s]),
);

function requiredEntry(endpoint: string): ManifestSection {
  const entry = MANIFEST_BY_ENDPOINT.get(endpoint);
  if (!entry) throw new Error(`home-sections: endpoint "${endpoint}" not in home-manifest.generated.json`);
  return entry;
}

export const HOME_SECTIONS: readonly HomeSection[] = [
  {
    id: "stats",
    label: "Overview stats",
    endpoint: "/dashboard/stats",
    access: accessFromManifest(requiredEntry("/dashboard/stats")),
  },
  {
    id: "personal",
    label: "Personal summary",
    endpoint: "/dashboard/personal",
    access: accessFromManifest(requiredEntry("/dashboard/personal")),
  },
  {
    id: "announcements",
    label: "Announcements",
    endpoint: "/dashboard/announcements",
    access: accessFromManifest(requiredEntry("/dashboard/announcements")),
  },
  {
    id: "my-issues",
    label: "My issues",
    endpoint: "/dashboard/my-issues",
    access: accessFromManifest(requiredEntry("/dashboard/my-issues")),
  },
  {
    id: "active-sprint",
    label: "Active sprint",
    endpoint: "/dashboard/active-sprint",
    access: accessFromManifest(requiredEntry("/dashboard/active-sprint")),
  },
  {
    id: "recent-projects",
    label: "Recent projects",
    endpoint: "/dashboard/recent-projects",
    access: accessFromManifest(requiredEntry("/dashboard/recent-projects")),
  },
  {
    id: "recent-activity",
    label: "Recent activity",
    endpoint: "/dashboard/recent-activity",
    access: accessFromManifest(requiredEntry("/dashboard/recent-activity")),
  },
  {
    id: "today-activities",
    label: "Today's activities",
    endpoint: "/dashboard/today-activities",
    access: accessFromManifest(requiredEntry("/dashboard/today-activities")),
  },
  {
    id: "leaves-today",
    label: "Who is out today",
    endpoint: "/dashboard/leaves-today",
    access: accessFromManifest(requiredEntry("/dashboard/leaves-today")),
  },
  {
    id: "pending-approvals",
    label: "Pending approvals",
    endpoint: "/dashboard/pending-approvals",
    access: accessFromManifest(requiredEntry("/dashboard/pending-approvals")),
  },
  {
    id: "team-attendance",
    label: "Team attendance",
    endpoint: "/dashboard/team-attendance",
    access: accessFromManifest(requiredEntry("/dashboard/team-attendance")),
  },
  {
    id: "executive",
    label: "Executive summary",
    endpoint: "/dashboard/executive",
    access: accessFromManifest(requiredEntry("/dashboard/executive")),
  },
  {
    id: "birthdays",
    label: "Birthdays",
    endpoint: "/dashboard/birthdays",
    access: accessFromManifest(requiredEntry("/dashboard/birthdays")),
  },
  {
    id: "upcoming-holidays",
    label: "Upcoming holidays",
    endpoint: "/dashboard/upcoming-holidays",
    access: accessFromManifest(requiredEntry("/dashboard/upcoming-holidays")),
  },
  {
    id: "my-leave-balance",
    label: "My leave balance",
    endpoint: "/dashboard/my-leave-balance",
    access: accessFromManifest(requiredEntry("/dashboard/my-leave-balance")),
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
