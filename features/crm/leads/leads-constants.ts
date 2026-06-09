import {
  Phone, Target, UserCheck, X, Zap, Eye,
} from "lucide-react";
import type React from "react";

export const STATUSES = ["NEW", "CONTACTED", "INTERESTED", "QUALIFIED", "CONVERTED", "LOST"] as const;

export const LEAD_SOURCES = ["referral", "campaign", "cold_call", "website", "social_media", "walk_in", "other"] as const;

export const LEAD_PRIORITIES = ["HOT", "WARM", "COLD"] as const;

export const ACTIVITY_TYPES = ["call", "email", "whatsapp", "meeting", "site_visit"] as const;

export const STATUS_CONFIG: Record<
  (typeof STATUSES)[number],
  { label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  NEW: { label: "New", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Zap },
  CONTACTED: { label: "Contacted", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20", icon: Phone },
  INTERESTED: { label: "Interested", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Eye },
  QUALIFIED: { label: "Qualified", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: Target },
  CONVERTED: { label: "Converted", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: UserCheck },
  LOST: { label: "Lost", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", icon: X },
};

export const SOURCE_COLORS: Record<string, string> = {
  referral: "bg-green-500/15 text-green-400 border-green-500/20",
  campaign: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  cold_call: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  website: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  social_media: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  walk_in: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  other: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

export const PRIORITY_CONFIG = {
  HOT: "bg-red-500/15 text-red-400 border-red-500/30",
  WARM: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  COLD: "bg-blue-400/15 text-blue-400 border-blue-400/30",
} as const;

export function isLeadSource(v: unknown): v is (typeof LEAD_SOURCES)[number] {
  return typeof v === "string" && (LEAD_SOURCES as readonly string[]).includes(v);
}

export function isLeadPriority(v: unknown): v is (typeof LEAD_PRIORITIES)[number] {
  return typeof v === "string" && (LEAD_PRIORITIES as readonly string[]).includes(v);
}

export function isActivityType(v: unknown): v is (typeof ACTIVITY_TYPES)[number] {
  return typeof v === "string" && (ACTIVITY_TYPES as readonly string[]).includes(v);
}

export function timeAgo(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    if (absDiff < 3600) return `in ${Math.floor(absDiff / 60)}m`;
    if (absDiff < 86400) return `in ${Math.floor(absDiff / 3600)}h`;
    return `in ${Math.floor(absDiff / 86400)}d`;
  }
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

export function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}
