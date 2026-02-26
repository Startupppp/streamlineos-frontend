"use client";

import { memo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion-variants";
import {
  Plus,
  UserPlus,
  BarChart3,
  CalendarDays,
  Settings,
} from "lucide-react";

const quickActions = [
  { label: "New Project", icon: Plus, href: "/projects" },
  { label: "Add Employee", icon: UserPlus, href: "/hr" },
  { label: "View Reports", icon: BarChart3, href: "/projects" },
  { label: "Team Schedule", icon: CalendarDays, href: "/hr/attendance" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export const QuickActions = memo(function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {quickActions.map((action) => {
        const ActionIcon = action.icon;
        return (
          <motion.div key={action.label} variants={fadeUp}>
            <Link href={action.href} aria-label={action.label}>
              <div className="group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-noir transition-all duration-200 hover:border-gold/40 hover:shadow-md hover:bg-gold/5 cursor-pointer">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 transition-colors group-hover:bg-gold/20">
                  <ActionIcon className="h-5 w-5 text-gold" aria-hidden="true" />
                </div>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {action.label}
                </span>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
});
