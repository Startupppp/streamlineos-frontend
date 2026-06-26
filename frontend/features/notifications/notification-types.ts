import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";
export type NotificationTabFilter = "ALL" | "UNREAD" | NotificationType;

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
