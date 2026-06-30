"use client";

import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Video, FileText } from "lucide-react";
import type { CrmActivityType } from "@/hooks/api/crm/crm-activities";

type TypeConfig = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
};

const TYPE_CONFIG: Record<CrmActivityType, TypeConfig> = {
  CALL:    { label: "Call",    icon: Phone,    color: "text-blue-600",    bg: "bg-blue-500/10"    },
  EMAIL:   { label: "Email",   icon: Mail,     color: "text-purple-600",  bg: "bg-purple-500/10"  },
  MEETING: { label: "Meeting", icon: Video,    color: "text-emerald-600", bg: "bg-emerald-500/10" },
  CUSTOM:  { label: "Task",    icon: FileText, color: "text-slate-600",   bg: "bg-slate-500/10"   },
};

interface ActivityTypeBadgeProps {
  type: CrmActivityType;
}

export function ActivityTypeBadge({ type }: ActivityTypeBadgeProps) {
  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.CUSTOM;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.bg} ${cfg.color} border-0 gap-1 text-xs font-medium`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}
