"use client";

import type { ComponentType } from "react";
import { Phone, Mail, Video, MessageSquare, Bell, Hash, CheckSquare } from "lucide-react";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Video,
  DEMO: MessageSquare,
  REMINDER: Bell,
  CUSTOM: Hash,
  DEFAULT: CheckSquare,
};

export function TaskTypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? ICONS.DEFAULT!;
  return <Icon className={className} />;
}
