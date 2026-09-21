import { Briefcase, BarChart3, UserCheck, Shield, ShieldCheck, TrendingUp, UserMinus, Share2, Sparkles, HeartHandshake, Scale, FileCheck, Coins, LifeBuoy, UserX, ShieldAlert, Lock } from "lucide-react";
import type { NavRoute } from "./sidebar-nav-types";

export const HR_GOVERNANCE_ROUTES: NavRoute[] = [
{
        label: "Workforce",
        icon: TrendingUp,
        href: "/hr/workforce",
        requiredPermission: "hr:analytics:read",
        children: [
          {
            label: "Workforce Planning",
            icon: TrendingUp,
            href: "/hr/workforce",
            requiredPermission: "hr:analytics:read",
          },
          {
            label: "Cost Analysis",
            icon: Coins,
            href: "/hr/workforce-cost",
            requiredPermission: "hr:analytics:read",
          },
          {
            label: "Contingent Workforce",
            icon: Briefcase,
            href: "/hr/contingent",
            requiredPermission: "hr:contracts:view",
          },
        ],
      },
{
        label: "People Ops",
        icon: UserCheck,
        href: "/hr/cases",
        requiredPermission: "hr:cases:view",
        children: [
          {
            label: "Service Delivery",
            icon: LifeBuoy,
            href: "/hr/service-delivery",
            requiredPermission: ["hr:cases:view", "hr:helpdesk:view"],
          },
          {
            label: "Employee Relations",
            icon: Scale,
            href: "/hr/cases",
            requiredPermission: "hr:cases:view",
          },
          {
            label: "Employee support",
            icon: LifeBuoy,
            href: "/hr/helpdesk",
            requiredPermission: "hr:helpdesk:view",
          },
          {
            label: "Engagement",
            icon: Sparkles,
            href: "/hr/engagement",
            requiredPermission: "hr:engagement:view",
          },
          {
            label: "Accommodations",
            icon: HeartHandshake,
            href: "/hr/accommodations",
            requiredPermission: "hr:accommodations:view",
          },
        ],
      },
{
        label: "Compliance & Risk",
        icon: Shield,
        href: "/hr/compliance",
        requiredPermission: "hr:compliance:manage",
        children: [
          {
            label: "Compliance",
            icon: Scale,
            href: "/hr/compliance",
            requiredPermission: "hr:compliance:manage",
          },
          {
            label: "Health & Safety",
            icon: ShieldAlert,
            href: "/hr/safety",
            requiredPermission: "hr:safety:view",
          },
          {
            label: "Emergency",
            icon: ShieldAlert,
            href: "/hr/emergency",
            requiredPermission: "hr:emergency:manage",
          },
          {
            label: "Labor Relations",
            icon: Scale,
            href: "/hr/labor-relations",
            requiredPermission: "hr:labor:view",
          },
          {
            label: "Legal Holds",
            icon: Lock,
            href: "/hr/legal-holds",
            requiredPermission: "hr:legalhold:view",
          },
          {
            label: "Data Retention",
            icon: Scale,
            href: "/hr/retention",
            requiredPermission: "hr:retention:manage",
          },
        ],
      },
{
        label: "Governance",
        icon: ShieldCheck,
        href: "/hr/identity",
        requiredPermission: "hr:identity:view",
        children: [
          {
            label: "Identity & Access",
            icon: Lock,
            href: "/hr/identity",
            requiredPermission: "hr:identity:view",
          },
          {
            label: "Delegations",
            icon: Share2,
            href: "/hr/delegations",
            requiredPermission: "hr:workflows:manage",
          },
          {
            label: "Simulator",
            icon: Sparkles,
            href: "/hr/simulator",
            requiredPermission: "hr:policies:manage",
          },
          {
            label: "Event Stream",
            icon: TrendingUp,
            href: "/hr/event-stream",
            requiredPermission: "hr:eventstream:view",
          },
        ],
      },
{
        label: "Exit Management",
        icon: UserMinus,
        href: "/hr/exit",
        requiredPermission: "hr:exit:view",
        children: [
          {
            label: "Full & Final",
            icon: FileCheck,
            href: "/hr/fnf",
            requiredPermission: "hr:payroll:approve",
          },
          {
            label: "Termination",
            icon: UserX,
            href: "/hr/termination",
            requiredPermission: "hr:exit:manage",
          },
        ],
      },
{
        label: "HR Analytics",
        icon: BarChart3,
        href: "/hr/analytics",
        requiredPermission: "hr:analytics:read",
      },
{
        label: "Access",
        icon: ShieldCheck,
        href: "/hr/access",
        requiredPermission: "hr:access:view",
      },
];
