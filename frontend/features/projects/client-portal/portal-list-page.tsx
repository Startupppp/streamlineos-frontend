"use client";

import Link from "next/link";
import { usePortalProjects } from "@/hooks/api/projects/client-portal";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, ArrowRight } from "lucide-react";

function ProjectCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1.5 flex-1">
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
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function PortalListPage() {
  const { data, isLoading, isError, refetch } = usePortalProjects();

  return (
    <PageWrapper
      eyebrow="Projects"
      title="Client Portal"
      subtitle="Your projects and their current status"
    >
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
        </div>
      ) : isError ? (
        <ErrorState onRetry={refetch} className="flex-1" />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          illustrationPreset="projects"
          title="No projects"
          description="You don't have access to any projects yet. Contact your project manager."
          className="flex-1"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((project) => (
            <Link
              key={project.id}
              href={`/projects/portal/${project.id}`}
              className="group rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: project.color ?? "#6366f1" }}
                >
                  {project.key.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">
                    {project.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono">{project.key}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] capitalize">{project.status}</Badge>
                {(project.startDate ?? project.targetEndDate) && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(project.startDate)} – {formatDate(project.targetEndDate) ?? "TBD"}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
