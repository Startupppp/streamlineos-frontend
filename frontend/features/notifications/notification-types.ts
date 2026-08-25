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

export const NOTIFICATION_CATEGORY_CONFIG: Record<
  NotificationCategory,
  CategoryConfig
> = {
  SECURITY: {
    label: "Security",
    icon: Shield,
    color: "text-status-danger-ink",
    bg: "bg-status-danger-surface",
  },
  CRM: {
    label: "CRM",
    icon: Handshake,
    color: "text-status-info-ink",
    bg: "bg-status-info-surface",
  },
  HRMS: {
    label: "HRMS",
    icon: Users,
    color: "text-status-info-ink",
    bg: "bg-status-info-surface",
  },
  BILLING: {
    label: "Billing",
    icon: CreditCard,
    color: "text-status-success-ink",
    bg: "bg-status-success-surface",
  },
  AI: {
    label: "AI",
    icon: Brain,
    color: "text-status-info-ink",
    bg: "bg-status-info-surface",
  },
  PROJECTS: {
    label: "Projects",
    icon: FolderOpen,
    color: "text-status-info-ink",
    bg: "bg-status-info-surface",
  },
  WORKFLOW: {
    label: "Workflow",
    icon: Settings,
    color: "text-status-warning-ink",
    bg: "bg-status-warning-surface",
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
    color: "text-status-info-ink",
    bg: "bg-status-info-surface",
  },
  PAYROLL: {
    label: "Payroll",
    icon: Banknote,
    color: "text-status-success-ink",
    bg: "bg-status-success-surface",
  },
  RECRUITMENT: {
    label: "Recruitment",
    icon: UserPlus,
    color: "text-status-success-ink",
    bg: "bg-status-success-surface",
  },
  KNOWLEDGE: {
    label: "Knowledge",
    icon: BookOpen,
    color: "text-status-info-ink",
    bg: "bg-status-info-surface",
  },
  SIGN: {
    label: "Sign",
    icon: PenLine,
    color: "text-status-warning-ink",
    bg: "bg-status-warning-surface",
  },
  INVENTORY: {
    label: "Inventory",
    icon: Package,
    color: "text-status-warning-ink",
    bg: "bg-status-warning-surface",
  },
  SURVEYS: {
    label: "Surveys",
    icon: ClipboardList,
    color: "text-category-pink-ink",
    bg: "bg-category-pink-surface",
  },
  CALENDAR: {
    label: "Calendar",
    icon: Calendar,
    color: "text-status-danger-ink",
    bg: "bg-status-danger-surface",
  },
  SUPPORT: {
    label: "Support",
    icon: LifeBuoy,
    color: "text-status-success-ink",
    bg: "bg-status-success-surface",
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
    dotColor: "bg-category-rose-fill",
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
