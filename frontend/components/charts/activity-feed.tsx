"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Ticket,
} from "lucide-react";
import { useCrmPeopleSlugs } from "@/hooks/api";

type ActivityType =
  | "deal_won"
  | "meeting"
  | "proposal"
  | "call"
  | "email"
  | "ticket"
  | "escalation";

interface ActivityItem {
  type: ActivityType;
  message: string;
  time: string;
  person?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
}

const typeConfig: Record<
  ActivityType,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bg: string;
  }
> = {
  deal_won: {
    icon: CheckCircle2,
    color: "text-status-success-ink",
    bg: "bg-status-success-surface",
  },
  meeting: {
    icon: Calendar,
    color: "text-status-info-ink",
    bg: "bg-status-info-surface",
  },
  proposal: {
    icon: FileText,
    color: "text-status-info-ink",
    bg: "bg-status-info-surface",
  },
  call: {
    icon: Phone,
    color: "text-status-warning-ink",
    bg: "bg-status-warning-surface",
  },
  email: {
    icon: Mail,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  ticket: {
    icon: Ticket,
    color: "text-status-info-ink",
    bg: "bg-status-info-surface",
  },
  escalation: {
    icon: AlertTriangle,
    color: "text-status-danger-ink",
    bg: "bg-status-danger-surface",
  },
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  const { data: slugMap } = useCrmPeopleSlugs();

  return (
    <div className="space-y-0">
      {items.map((item, i) => {
        const config = typeConfig[item.type];
        const Icon = config.icon;
        const personSlug =
          item.person && slugMap ? (slugMap[item.person] ?? null) : null;

        return (
          <motion.div
            key={i}
            className="flex gap-3 py-3 first:pt-0"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center shrink-0`}
              >
                <Icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              {i < items.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <p className="text-sm text-foreground leading-snug">
                {item.message}
              </p>
              {item.person && (
                <div className="flex items-center gap-2 mt-0.5">
                  {personSlug ? (
                    <Link
                      href={`/sales/person/${personSlug}`}
                      className="text-xs text-primary hover:text-primary/80 hover:underline"
                    >
                      {item.person}
                    </Link>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {item.person}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {item.time}
                  </span>
                </div>
              )}
              {!item.person && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {item.time}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
