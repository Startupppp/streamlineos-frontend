import { Users, Briefcase, Contact2, Network, Shield, ShieldCheck, CreditCard, CircleUser, Coins, Map, Zap, History, GitBranch, Building2, UserCog, ArrowLeftRight, LayoutGrid, Key } from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const ADMINISTRATION_NAV_GROUPS: NavGroup[] = [
{
    label: "Account",
    routes: [
      {
        label: "My Account",
        icon: CircleUser,
        href: "/settings",
        exact: true,
      },
    ],
  },
{
    label: "Workspace",
    requiredPermission: ["settings:manage", "ownership:transfer:respond"],
    routes: [
      {
        label: "Organization Settings",
        icon: Building2,
        href: "/settings/organization",
        exact: true,
        requiredPermission: "settings:view",
      },
      {
        label: "Incoming Transfer",
        icon: ArrowLeftRight,
        href: "/settings/incoming-transfer",
        requiredPermission: "ownership:transfer:respond",
      },
    ],
  },
{
    label: "People",
    requiredPermission: [
      "directory:people:view",
      "settings:view",
      "settings:organization:manage",
    ],
    routes: [
      {
        label: "Directory",
        icon: Contact2,
        href: "/settings/directory",
        exact: true,
        activePrefixes: ["/settings/directory/"],
        requiredPermission: "directory:people:view",
      },
      {
        label: "Members & Access",
        icon: UserCog,
        href: "/settings/users",
        exact: true,
        requiredPermission: "settings:view",
      },
    ],
  },
{
    label: "Access",
    requiredPermission: ["settings:rbac:manage", "settings:manage"],
    routes: [
      {
        label: "Roles & Permissions",
        icon: Shield,
        href: "/settings/roles",
        requiredPermission: "settings:rbac:manage",
      },
      {
        label: "Delegations",
        icon: ShieldCheck,
        href: "/settings/delegations",
        requiredPermission: "settings:rbac:manage",
      },
    ],
  },
{
    label: "Organization",
    requiredPermission: ["settings:manage", "settings:view"],
    module: "hrms",
    routes: [
      {
        label: "Structure",
        icon: Network,
        href: "/settings/organization/structure",
        exact: true,
        requiredPermission: "settings:view",
      },
      {
        label: "Business Units",
        icon: Building2,
        href: "/settings/organization/business-units",
        requiredPermission: "settings:view",
      },
      {
        label: "Branches",
        icon: GitBranch,
        href: "/settings/organization/branches",
        requiredPermission: "settings:view",
      },
      {
        label: "Departments",
        icon: Briefcase,
        href: "/settings/organization/departments",
        requiredPermission: "settings:view",
      },
      {
        label: "Teams",
        icon: Users,
        href: "/settings/organization/teams",
        requiredPermission: "settings:view",
      },
      {
        label: "Locations",
        icon: Map,
        href: "/settings/organization/locations",
        requiredPermission: "settings:view",
      },
      {
        label: "Cost Centers",
        icon: Coins,
        href: "/settings/organization/cost-centers",
        requiredPermission: "settings:view",
      },
      {
        label: "Organization Chart",
        icon: Network,
        href: "/settings/organization/chart",
        requiredPermission: "settings:view",
      },
    ],
  },
{
    label: "Modules",
    requiredPermission: "settings:manage",
    routes: [
      {
        label: "Modules",
        icon: LayoutGrid,
        href: "/settings/modules",
        requiredPermission: "settings:manage",
      },
    ],
  },
{
    label: "Billing",
    requiredPermission: ["settings:manage", "billing:ai-credits:view"],
    routes: [
      {
        label: "Billing & Plan",
        icon: CreditCard,
        href: "/settings/billing",
        exact: true,
        requiredPermission: "settings:manage",
      },
      {
        label: "AI Credits",
        icon: Zap,
        href: "/settings/billing/ai-credits",
        requiredPermission: "billing:ai-credits:view",
      },
    ],
  },
{
    label: "Security",
    requiredPermission: "settings:manage",
    routes: [
      {
        label: "Audit Logs",
        icon: History,
        href: "/settings/audit-log",
        requiredPermission: "audit-log:read",
      },
    ],
  },
{
    label: "Developer",
    requiredPermission: [
      "settings:manage",
      "settings:api-tokens:read",
      "settings:webhooks:manage",
    ],
    routes: [
      {
        label: "Personal Access Tokens",
        icon: Key,
        href: "/settings/api-tokens",
        requiredPermission: "settings:api-tokens:read",
      },
      {
        label: "Webhooks",
        icon: Zap,
        href: "/settings/webhooks",
        requiredPermission: "settings:webhooks:manage",
      },
    ],
  },
];
