"use client";

import { motion } from "framer-motion";
import { Users2, UserCheck, FolderKanban, Wallet, PackageSearch, Headphones, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_SUITES } from "../_lib/constants";
import { NavButtons } from "./nav-buttons";

type StepAppsProps = {
  installedApps: string[];
  onToggle: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const APP_ICONS: Record<string, LucideIcon> = {
  CRM: Users2,
  HR: UserCheck,
  PROJECTS: FolderKanban,
  FINANCE: Wallet,
  INVENTORY: PackageSearch,
  HELPDESK: Headphones,
};

export function StepApps({ installedApps, onToggle, onBack, onNext }: StepAppsProps) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted-foreground">
        Based on your goals and industry. You can add or remove modules anytime.
      </p>

      <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Module selection">
        {APP_SUITES.map((app, i) => {
          const installed = installedApps.includes(app.id);
          const Icon = APP_ICONS[app.id] ?? Users2;
          return (
            <motion.button
              key={app.id}
              type="button"
              role="checkbox"
              aria-checked={installed}
              onClick={() => onToggle(app.id)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "text-left p-3 rounded-lg border transition-colors",
                installed
                  ? "border-blue-500 bg-blue-50"
                  : "border-border bg-card hover:border-blue-300 hover:bg-muted/40",
              )}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className={cn(
                  "h-6 w-6 rounded-md flex items-center justify-center",
                  installed ? "bg-foreground" : "bg-muted",
                )}>
                  <Icon className={cn("h-3.5 w-3.5", installed ? "text-background" : "text-muted-foreground")} />
                </div>
                {installed && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  </motion.div>
                )}
              </div>
              <p className={cn("text-[13px] font-medium mb-0.5", installed ? "text-blue-900" : "text-foreground")}>
                {app.label}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">{app.description}</p>
            </motion.button>
          );
        })}
      </div>

      {installedApps.length > 0 && (
        <p className="text-[12px] text-blue-600">
          {installedApps.length} module{installedApps.length !== 1 ? "s" : ""} selected
        </p>
      )}

      <NavButtons onBack={onBack} onNext={onNext} skipLabel="Skip" />
    </div>
  );
}
