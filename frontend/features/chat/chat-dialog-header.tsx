"use client";

import type { ReactNode } from "react";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ChatDialogHeaderProps {
  title: ReactNode;
  description: string;
  className?: string;
}

export function ChatDialogHeader({
  title,
  description,
  className,
}: ChatDialogHeaderProps) {
  return (
    <DialogHeader
      className={cn(
        "border-b border-border px-4 py-3 pr-12 text-left",
        className,
      )}
    >
      <DialogTitle className="truncate text-base">{title}</DialogTitle>
      <DialogDescription className="sr-only">{description}</DialogDescription>
    </DialogHeader>
  );
}
