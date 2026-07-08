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
  type LucideIcon,
} from "lucide-react";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
export type NotificationPriority = "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
export type NotificationCategory =
  | "SECURITY"
  | "CRM"
  | "HRMS"
  | "BILLING"
  | "AI"
  | "PROJECTS"
  | "WORKFLOW"
  | "MARKETING"
  | "SYSTEM";
export type NotificationSection =
  | "ALL"
  | "UNREAD"
  | "READ"
  | "MENTIONS"
  | "ASSIGNED_TO_ME"
  | "APPROVALS"
  | "BROADCASTS"
  | "ARCHIVED"
  | "SYSTEM"
  | "PINNED";

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
    iconColor: "text-blue-600",
    bg: "bg-blue-500/10",
    label: "Info",
    badgeBorder: "border-blue-200 text-blue-600",
  },
  SUCCESS: {
    icon: CheckCircle2,
    iconColor: "text-emerald-600",
    bg: "bg-emerald-500/10",
    label: "Success",
    badgeBorder: "border-emerald-200 text-emerald-600",
  },
  WARNING: {
    icon: AlertTriangle,
    iconColor: "text-amber-600",
    bg: "bg-amber-500/10",
    label: "Warning",
    badgeBorder: "border-amber-200 text-amber-600",
  },
  ERROR: {
    icon: XCircle,
    iconColor: "text-red-600",
    bg: "bg-red-500/10",
    label: "Error",
    badgeBorder: "border-red-200 text-red-600",
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
    color: "text-red-600",
    bg: "bg-red-500/10",
  },
  CRM: {
    label: "CRM",
    icon: Handshake,
    color: "text-blue-600",
    bg: "bg-blue-500/10",
  },
  HRMS: {
    label: "HRMS",
    icon: Users,
    color: "text-violet-600",
    bg: "bg-violet-500/10",
  },
  BILLING: {
    label: "Billing",
    icon: CreditCard,
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
  },
  AI: {
    label: "AI",
    icon: Brain,
    color: "text-purple-600",
    bg: "bg-purple-500/10",
  },
  PROJECTS: {
    label: "Projects",
    icon: FolderOpen,
    color: "text-indigo-600",
    bg: "bg-indigo-500/10",
  },
  WORKFLOW: {
    label: "Workflow",
    icon: Settings,
    color: "text-orange-600",
    bg: "bg-orange-500/10",
  },
  MARKETING: {
    label: "Marketing",
    icon: Megaphone,
    color: "text-pink-600",
    bg: "bg-pink-500/10",
  },
  SYSTEM: {
    label: "System",
    icon: Bell,
    color: "text-slate-600",
    bg: "bg-slate-500/10",
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
  LOW: { label: "Low", color: "text-slate-500", dotColor: "bg-slate-400" },
  NORMAL: { label: "Normal", color: "text-blue-500", dotColor: "bg-blue-400" },
  HIGH: {
    label: "High",
    color: "text-amber-500",
    dotColor: "bg-amber-400",
  },
  CRITICAL: {
    label: "Critical",
    color: "text-red-500",
    dotColor: "bg-red-500",
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

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "SECURITY",
  "CRM",
  "HRMS",
  "BILLING",
  "AI",
  "PROJECTS",
  "WORKFLOW",
  "MARKETING",
  "SYSTEM",
];

export const NOTIFICATION_PRIORITIES: NotificationPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "CRITICAL",
];
