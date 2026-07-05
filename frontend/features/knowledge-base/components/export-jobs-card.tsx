"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSection } from "@/components/ui/page-wrapper";
import { useKbExportJobs } from "@/hooks/api/kb";
import { KbDownloadIcon, KbFileTextIcon } from "@/features/knowledge-base/lib/kb-icons";
import type { KbExportJob } from "@/hooks/api/kb/import-export";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function JobRow({ job }: { job: KbExportJob }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card text-sm">
      <KbFileTextIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="flex-1 truncate capitalize">{job.format} export</span>
      <span className="text-xs text-muted-foreground shrink-0 capitalize">{job.status}</span>
      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(job.createdAt)}</span>
    </div>
  );
}

export function ExportJobsCard() {
  const { data: jobs = [], isLoading } = useKbExportJobs();

  return (
    <PageSection
      title="Export History"
      description="Per-page export is available from the ⋯ menu on any wiki page."
    >
      {isLoading && (
        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      )}

      {!isLoading && jobs.length === 0 && (
        <EmptyState
          compact
          illustration={<KbDownloadIcon className="h-5 w-5 text-muted-foreground/40" />}
          title="No exports yet"
          description="Use the ⋯ menu on a page to export it as Markdown or HTML."
        />
      )}

      {!isLoading && jobs.length > 0 && (
        <div className="space-y-1.5">
          {jobs.map((job) => (
            <JobRow key={job.id} job={job} />
          ))}
        </div>
      )}
    </PageSection>
  );
}
