"use client";

import {
  CheckSquare,
  Bug,
  BookOpen,
  Layers,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/utils";

const typeMap = {
  TASK: { icon: CheckSquare, color: "text-blue-500" },
  BUG: { icon: Bug, color: "text-red-500" },
  STORY: { icon: BookOpen, color: "text-green-500" },
  EPIC: { icon: Layers, color: "text-violet-600" },
  SUBTASK: { icon: GitBranch, color: "text-muted-foreground" },
} as const;

interface TicketTypeIconProps {
  type: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TicketTypeIcon({
  type,
  size = "sm",
  className,
}: TicketTypeIconProps) {
  const rawKey = type.toUpperCase();
  const isTypeKey = (k: string): k is keyof typeof typeMap => k in typeMap;
  const config = isTypeKey(rawKey) ? typeMap[rawKey] : typeMap.TASK;
  const Icon = config.icon;

  const sizeClass =
    size === "sm" ? "h-3.5 w-3.5" : size === "md" ? "h-4 w-4" : "h-5 w-5";

  return <Icon className={cn(sizeClass, config.color, className)} />;
}
