import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Shield,
  Handshake,
  Users,
  CreditCard,
  Brain,
  FolderOpen,
  Settings,
  Megaphone,
  Bell,
  MessageSquare,
  Banknote,
  UserPlus,
  BookOpen,
  PenLine,
  Package,
  ClipboardList,
  Calendar,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

import type {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  NotificationSection,
} from "@/types/notifications";
import { NOTIFICATION_CATEGORY_VALUES } from "@/types/notifications";

export type {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  NotificationSection,
};
export { NOTIFICATION_CATEGORY_VALUES };

interface TypeConfig {
  icon: LucideIcon;
  iconColor: string;
  bg: string;
  label: string;
  badgeBorder: string;
}

export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, TypeConfig> = {
  INFO: {
    icon: Info,
    iconColor: "text-status-info-ink",
    bg: "bg-status-info-surface",
    label: "Info",
    badgeBorder: "border-status-info-rule text-status-info-ink",
  },
  SUCCESS: {
    icon: CheckCircle2,
    iconColor: "text-status-success-ink",
    bg: "bg-status-success-surface",
    label: "Success",
    badgeBorder: "border-status-success-rule text-status-success-ink",
  },
  WARNING: {
    icon: AlertTriangle,
    iconColor: "text-status-warning-ink",
    bg: "bg-status-warning-surface",
    label: "Warning",
    badgeBorder: "border-status-warning-rule text-status-warning-ink",
  },
  ERROR: {
    icon: XCircle,
    iconColor: "text-status-danger-ink",
    bg: "bg-status-danger-surface",
    label: "Error",
    badgeBorder: "border-status-danger-rule text-status-danger-ink",
  },
};

interface CategoryConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

/**
 * Eighteen categories, sixteen hues.
 *
 * A category is where a notification came from, not how urgent it is — urgency
 * is `NOTIFICATION_PRIORITY_CONFIG` below, and the two are shown side by side.
 * Reading the status scale here made six of the eighteen render as "info" and
 * four as "success", so the filter chips lied about how many kinds there were.
 *
 * Where a category matches a sidebar product it wears that product's accent —
 * CRM blue, HRMS emerald, Projects violet, Inventory orange, Support lime,
 * Surveys fuchsia — so the same module is the same colour in the rail and in
 * the tray.
 *
 * Two pairs double up, and only these two. Both are one subject arriving under
 * two names, not two subjects that ran out of hues:
 *
 *   green  — BILLING and PAYROLL. Money moving, in and out.
 *   amber  — WORKFLOW and SIGN. A routing step waiting on somebody: an
 *            automation run paused for approval, or an envelope paused for a
 *            signature.
 *
 * SYSTEM stays on the neutral rather than taking `category-slate`: it is the
 * absence of a source, which is what the muted pair already says.
 */
export const NOTIFICATION_CATEGORY_CONFIG: Record<
  NotificationCategory,
  CategoryConfig
> = {
  SECURITY: {
    label: "Security",
    icon: Shield,
    color: "text-category-red-ink",
    bg: "bg-category-red-surface",
  },
  CRM: {
    label: "CRM",
    icon: Handshake,
    color: "text-category-blue-ink",
    bg: "bg-category-blue-surface",
  },
  HRMS: {
    label: "HRMS",
    icon: Users,
    color: "text-category-emerald-ink",
    bg: "bg-category-emerald-surface",
  },
  BILLING: {
    label: "Billing",
    icon: CreditCard,
    color: "text-category-green-ink",
    bg: "bg-category-green-surface",
  },
  AI: {
    label: "AI",
    icon: Brain,
    color: "text-category-indigo-ink",
    bg: "bg-category-indigo-surface",
  },
  PROJECTS: {
    label: "Projects",
    icon: FolderOpen,
    color: "text-category-violet-ink",
    bg: "bg-category-violet-surface",
  },
  WORKFLOW: {
    label: "Workflow",
    icon: Settings,
    color: "text-category-amber-ink",
    bg: "bg-category-amber-surface",
  },
  MARKETING: {
    label: "Marketing",
    icon: Megaphone,
    color: "text-category-pink-ink",
    bg: "bg-category-pink-surface",
  },
  SYSTEM: {
    label: "System",
    icon: Bell,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  CHAT: {
    label: "Chat",
    icon: MessageSquare,
    color: "text-category-sky-ink",
    bg: "bg-category-sky-surface",
  },
  PAYROLL: {
    label: "Payroll",
    icon: Banknote,
    color: "text-category-green-ink",
    bg: "bg-category-green-surface",
  },
  RECRUITMENT: {
    label: "Recruitment",
    icon: UserPlus,
    color: "text-category-teal-ink",
    bg: "bg-category-teal-surface",
  },
  KNOWLEDGE: {
    label: "Knowledge",
    icon: BookOpen,
    color: "text-category-cyan-ink",
    bg: "bg-category-cyan-surface",
  },
  SIGN: {
    label: "Sign",
    icon: PenLine,
    color: "text-category-amber-ink",
    bg: "bg-category-amber-surface",
  },
  INVENTORY: {
    label: "Inventory",
    icon: Package,
    color: "text-category-orange-ink",
    bg: "bg-category-orange-surface",
  },
  SURVEYS: {
    label: "Surveys",
    icon: ClipboardList,
    color: "text-category-fuchsia-ink",
    bg: "bg-category-fuchsia-surface",
  },
  CALENDAR: {
    label: "Calendar",
    icon: Calendar,
    color: "text-category-rose-ink",
    bg: "bg-category-rose-surface",
  },
  SUPPORT: {
    label: "Support",
    icon: LifeBuoy,
    color: "text-category-lime-ink",
    bg: "bg-category-lime-surface",
  },
};

interface PriorityConfig {
  label: string;
  color: string;
  dotColor: string;
}

export const NOTIFICATION_PRIORITY_CONFIG: Record<
  NotificationPriority,
  PriorityConfig
> = {
  LOW: { label: "Low", color: "text-muted-foreground", dotColor: "bg-category-slate-fill" },
  NORMAL: { label: "Normal", color: "text-status-info-ink", dotColor: "bg-category-blue-fill" },
  HIGH: {
    label: "High",
    color: "text-status-warning-ink",
    dotColor: "bg-category-amber-fill",
  },
  CRITICAL: {
    label: "Critical",
    color: "text-status-danger-ink",
    // `status-danger` is red; the dot beside it was rose. Now that the
    // categorical scale has a red, the two halves of the entry agree.
    dotColor: "bg-category-red-fill",
  },
};

export const SECTION_TABS: Array<{ value: NotificationSection; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "UNREAD", label: "Unread" },
  { value: "READ", label: "Read" },
  { value: "MENTIONS", label: "Mentions" },
  { value: "ASSIGNED_TO_ME", label: "Assigned to Me" },
  { value: "APPROVALS", label: "Approvals" },
  { value: "BROADCASTS", label: "Broadcasts" },
  { value: "PINNED", label: "Pinned" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "SYSTEM", label: "System" },
];

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [...NOTIFICATION_CATEGORY_VALUES];

export const NOTIFICATION_PRIORITIES: NotificationPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
];
