"use client";

import type { ComponentType } from "react";
import { Phone, Mail, Video, MessageSquare, Bell, Hash, CheckSquare, CornerDownRight } from "lucide-react";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Video,
  DEMO: MessageSquare,
  FOLLOW_UP: CornerDownRight,
  REMINDER: Bell,
  CUSTOM: Hash,
  DEFAULT: CheckSquare,
};

const DEFAULT_ICON: ComponentType<{ className?: string }> = CheckSquare;

export function TaskTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? DEFAULT_ICON;
  return <Icon className={className} />;
}
