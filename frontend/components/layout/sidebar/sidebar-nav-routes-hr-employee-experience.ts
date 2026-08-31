import { Receipt, FileText, MessageSquareText, ShieldCheck, Wallet, Star, TrendingUp, BookOpen, Target, Package, Globe, PackageMinus, HeartHandshake, MailOpen, FileCheck, Coins, RefreshCcw, BarChart2, FileSearch, CheckSquare } from "lucide-react";
import type { NavRoute } from "./sidebar-nav-types";

export const HR_EMPLOYEE_EXPERIENCE_ROUTES: NavRoute[] = [
{
        label: "Compensation & Benefits",
        icon: Wallet,
        href: "/hr/benefits",
        requiredPermission: [
          "hr:benefits:view",
          "hr:compensation:manage",
          "hr:equity:view",
        ],
        children: [
          {
            label: "Benefits",
            icon: HeartHandshake,
            href: "/hr/benefits",
            requiredPermission: "hr:benefits:view",
          },
          {
            label: "Compensation Planning",
            icon: Coins,
            href: "/hr/compensation-planning",
            requiredPermission: "hr:compensation:manage",
          },
          {
            label: "Equity & ESOP",
            icon: TrendingUp,
            href: "/hr/equity",
            requiredPermission: "hr:equity:view",
          },
        ],
      },
{
        label: "Expenses",
        icon: Receipt,
        href: "/hr/expenses",
        requiredPermission: "hr:expenses:view",
        children: [
          {
            label: "Reimbursements",
            icon: RefreshCcw,
            href: "/hr/reimbursements",
            requiredPermission: "hr:payroll:view",
          },
          {
            label: "Travel",
            icon: Globe,
            href: "/hr/travel",
            exact: true,
            requiredPermission: "hr:expenses:view",
          },
          {
            label: "Travel Approvals",
            icon: CheckSquare,
            href: "/hr/travel/approvals",
            requiredPermission: "hr:expenses:manage",
          },
        ],
      },
{
        label: "Performance",
        icon: Star,
        href: "/hr/performance",
        requiredPermission: "hr:performance:manage",
        children: [
          {
            label: "Goals & OKRs",
            icon: Target,
            href: "/hr/goals",
            requiredPermission: "hr:performance:view",
          },
          {
            label: "KPIs & Competencies",
            icon: BarChart2,
            href: "/hr/kpis",
            requiredPermission: "hr:performance:view",
          },
          {
            label: "360 Feedback",
            icon: MessageSquareText,
            href: "/hr/feedback",
            requiredPermission: "hr:feedback:view",
          },
          {
            label: "Analytics",
            icon: TrendingUp,
            href: "/hr/performance/analytics",
            requiredPermission: "hr:performance:view",
          },
        ],
      },
{
        label: "Documents",
        icon: FileText,
        href: "/hr/documents",
        requiredPermission: "hr:documents:view",
        children: [
          {
            label: "Doc Types",
            icon: FileCheck,
            href: "/hr/document-types",
            requiredPermission: "hr:documents:manage",
          },
          {
            label: "Doc Review",
            icon: FileSearch,
            href: "/hr/document-review",
            requiredPermission: "hr:documents:view",
          },
          {
            label: "Handbook",
            icon: BookOpen,
            href: "/hr/handbook",
            requiredPermission: "hr:documents:manage",
          },
          {
            label: "Email Templates",
            icon: MailOpen,
            href: "/hr/email-templates",
            requiredPermission: "hr:email-templates:manage",
          },
          {
            label: "Background Checks",
            icon: ShieldCheck,
            href: "/hr/background-verification",
            requiredPermission: "hr:sensitive:view",
          },
        ],
      },
{
        label: "Assets",
        icon: Package,
        href: "/hr/assets",
        requiredPermission: "hr:assets:view",
        children: [
          {
            label: "Asset Returns",
            icon: PackageMinus,
            href: "/hr/asset-returns",
            requiredPermission: "hr:assets:view",
          },
        ],
      },
];
