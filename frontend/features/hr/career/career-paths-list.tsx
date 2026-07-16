"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { ChevronDownIcon, ChevronUpIcon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useCareerPaths } from "@/hooks/api/hr/career";
import { TruncatedText } from "@/components/ui/truncated-text";

interface Props {
  canManage: boolean;
}

export function CareerPathsList({ canManage: _canManage }: Props) {
  const { data: paths, isLoading } = useCareerPaths();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  function handleToggle(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!paths || paths.length === 0) {
    return (
      <EmptyState
        illustrationPreset="learning"
        title="No career paths yet"
        description="Create structured career paths to help employees grow"
        className={CONTENT_FILL_PANEL}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {paths.map((path, idx) => {
        const isExpanded = expandedIds.has(path.id);
        return (
          <motion.div
            key={path.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", delay: idx * 0.05 }}
            className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold text-sm text-foreground leading-snug">{path.name}</span>
              {path.department && (
                <Badge variant="secondary" className="text-[11px] shrink-0">
                  {path.department}
                </Badge>
              )}
            </div>

            {path.description && (
              <TruncatedText text={path.description} lines={2} className="text-xs text-muted-foreground" />
            )}

            <div className="flex items-center justify-between mt-auto">
              <span className="text-xs bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 font-medium dark:bg-blue-500/10 dark:text-blue-300">
                {path.levels.length} {path.levels.length === 1 ? "level" : "levels"}
              </span>
              <AnimatedIconButton
                icon={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                iconSize={14}
                iconClassName="mr-1"
                variant="ghost"
                size="sm"
                className="px-2 text-xs text-muted-foreground"
                onClick={() => handleToggle(path.id)}
              >
                {isExpanded ? "Collapse" : "Expand"}
              </AnimatedIconButton>
            </div>

            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex flex-col gap-2 border-t border-border pt-3"
              >
                {path.levels.map((level) => (
                  <div
                    key={level.level}
                    className="rounded-xl border border-border bg-muted/30 p-3 flex flex-col gap-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 dark:bg-blue-500/10 dark:text-blue-300">
                        {level.level}
                      </span>
                      <span className="text-xs font-semibold text-foreground">{level.title}</span>
                    </div>
                    {level.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-7">
                        {level.skills.map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] bg-blue-50 text-blue-700 rounded-full px-1.5 py-0.5 dark:bg-blue-500/10 dark:text-blue-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                    {level.requirements.length > 0 && (
                      <ul className="pl-7 space-y-0.5">
                        {level.requirements.map((req) => (
                          <li key={req} className="text-[11px] text-muted-foreground list-disc list-inside">
                            {req}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
