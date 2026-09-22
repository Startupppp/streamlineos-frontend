import { LayoutDashboard, Users, Briefcase, BarChart3, Share2, FileCheck, Inbox, SlidersHorizontal, Truck, KanbanSquare, Video, Layers } from "lucide-react";
import type { NavGroup } from "./sidebar-nav-types";

export const RECRUITMENT_NAV_GROUPS: NavGroup[] = [
{
    label: "Recruitment OS",
    product: "recruitment",
    module: "recruitment",
    requiredPermission: [
      "hr:offers:view",
      "hr:interviews:view",
      "hr:requisitions:view",
    ],
    routes: [
      {
        label: "Command Center",
        icon: LayoutDashboard,
        href: "/hr/recruitment",
        exact: true,
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Jobs",
        icon: Briefcase,
        href: "/hr/recruitment/jobs",
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Candidates",
        icon: Users,
        href: "/hr/recruitment/candidates",
        exact: true,
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Pipeline",
        icon: KanbanSquare,
        href: "/hr/recruitment/pipeline",
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Intake Inbox",
        icon: Inbox,
        href: "/hr/recruitment/candidates/intake",
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Interviews",
        icon: Video,
        href: "/hr/recruitment/interviews",
        requiredPermission: "hr:interviews:view",
      },
      {
        label: "Offers",
        icon: FileCheck,
        href: "/hr/recruitment/offers",
        requiredPermission: "hr:offers:view",
      },
      {
        label: "Referrals",
        icon: Share2,
        href: "/hr/recruitment/referrals",
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Internal Jobs",
        icon: Briefcase,
        href: "/hr/recruitment/internal-jobs",
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Recruiters",
        icon: Users,
        href: "/hr/recruitment/recruiters",
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Booking Links",
        icon: Video,
        href: "/hr/recruitment/booking-links",
        requiredPermission: "hr:interviews:view",
      },
      {
        label: "Inbox",
        icon: Inbox,
        href: "/hr/recruitment/inbox",
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Vendors",
        icon: Truck,
        href: "/hr/recruitment/vendors",
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Talent Pools",
        icon: Layers,
        href: "/hr/recruitment/talent-pools",
        requiredPermission: "hr:requisitions:view",
      },
      {
        label: "Analytics",
        icon: BarChart3,
        href: "/hr/recruitment/analytics",
        requiredPermission: "hr:interviews:view",
      },
      {
        label: "Settings",
        icon: SlidersHorizontal,
        href: "/hr/recruitment/settings",
        requiredPermission: "hr:requisitions:manage",
      },
    ],
  },
];
