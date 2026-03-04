"use client";

import { Plus } from "lucide-react";

interface LaunchProjectCardProps {
  onClick: () => void;
}

export function LaunchProjectCard({ onClick }: LaunchProjectCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gold/30 bg-gold/5 hover:bg-gold/10 hover:border-gold/50 transition-all cursor-pointer p-6 h-full min-h-[220px]"
      aria-label="Launch a new project"
      role="listitem"
    >
      <div className="h-12 w-12 rounded-full bg-gold/15 flex items-center justify-center">
        <Plus className="h-6 w-6 text-gold" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">Launch New Project</p>
        <p className="text-xs text-muted-foreground mt-1">Start a new journey today</p>
      </div>
    </button>
  );
}
