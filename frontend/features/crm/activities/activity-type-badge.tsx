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
  CALL:    { label: "Call",    icon: Phone,    color: "text-status-info-ink",    bg: "bg-status-info-surface"    },
  EMAIL:   { label: "Email",   icon: Mail,     color: "text-status-info-ink",   bg: "bg-status-info-surface"    },
  MEETING: { label: "Meeting", icon: Video,    color: "text-status-success-ink", bg: "bg-status-success-surface" },
  CUSTOM:  { label: "Task",    icon: FileText, color: "text-muted-foreground", bg: "bg-muted"          },
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
