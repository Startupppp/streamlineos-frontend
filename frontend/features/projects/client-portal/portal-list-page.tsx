"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { usePortalProjects } from "@/hooks/api/projects/client-portal";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ArrowRight } from "lucide-react";
import {
  PmPageShell,
  PmPanel,
  PmSection,
  PmStaggerList,
  PM_PANEL,
} from "@/features/projects/shared/pm-chrome";
import { listItem, listItemReduced, pmSnappy } from "@/features/projects/shared/pm-motion";
import { TEXT_ONE_LINE } from "@/features/projects/shared/text-overflow";
import { cn } from "@/lib/utils";

function ProjectCardSkeleton() {
  return (
    <div className={cn(PM_PANEL, "space-y-3 p-5")}>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function PortalListPage() {
  const { data, isLoading, isError, refetch } = usePortalProjects();
  const shouldReduceMotion = useReducedMotion();

  function handleRetry() {
    void refetch();
  }

  return (
    <PageWrapper
      eyebrow="Projects"
      title="Client Portal"
      subtitle="Your projects and their current status"
    >
      <PmPageShell>
        <PmSection index={0}>
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <ProjectCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <PmPanel className="flex min-h-[14rem] items-center justify-center p-6">
              <ErrorState onRetry={handleRetry} className="flex-1" />
            </PmPanel>
          ) : (data ?? []).length === 0 ? (
            <PmPanel className="flex min-h-[14rem] items-center justify-center p-6">
              <EmptyState
                illustrationPreset="projects"
                title="No projects"
                description="You don't have access to any projects yet. Contact your project manager."
                className="min-h-[12rem]"
              />
            </PmPanel>
          ) : (
            <PmStaggerList className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data?.map((project) => (
                <motion.div
                  key={project.id}
                  variants={shouldReduceMotion ? listItemReduced : listItem}
                  transition={pmSnappy}
                >
                  <Link
                    href={`/projects/portal/${project.id}`}
                    className={cn(
                      PM_PANEL,
                      "group block p-5 transition-[border-color,box-shadow] duration-200 hover:border-primary/35 hover:shadow-md",
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: project.color ?? "var(--primary)" }}
                      >
                        {project.key.substring(0, 2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            TEXT_ONE_LINE,
                            "text-sm font-semibold text-foreground transition-colors group-hover:text-primary",
                          )}
                          title={project.name}
                        >
                          {project.name}
                        </p>
                        <p className="font-mono text-[10px] text-muted-foreground">{project.key}</p>
                      </div>
                      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </div>
                    <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {project.status}
                      </Badge>
                      {project.startDate ?? project.targetEndDate ? (
                        <span className="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3 shrink-0" />
                          <span className={TEXT_ONE_LINE}>
                            {formatDate(project.startDate)} –{" "}
                            {formatDate(project.targetEndDate) ?? "TBD"}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </PmStaggerList>
          )}
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
