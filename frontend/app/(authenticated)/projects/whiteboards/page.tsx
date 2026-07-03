"use client";

import Link from "next/link";
import { useCallback } from "react";
import { formatDistanceToNow } from "date-fns";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RequireModule } from "@/components/auth/require-module";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyUploadIllustration } from "@/components/illustrations";
import { Briefcase, Globe, Lock, PenTool } from "lucide-react";
import { useAllWhiteboards, type WhiteboardHubItem } from "@/hooks/api/projects";

function VisibilityIcon({ visibility }: { visibility: WhiteboardHubItem["visibility"] }) {
  if (visibility === "private") {
    return <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Private" />;
  }
  if (visibility === "public") {
    return <Globe className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Public link" />;
  }
  return null;
}

function BoardCard({ board }: { board: WhiteboardHubItem }) {
  const updatedLabel = board.updatedAt
    ? formatDistanceToNow(new Date(board.updatedAt), { addSuffix: true })
    : null;

  return (
    <Link
      href={`/projects/${board.projectId}/whiteboard?board=${board.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-accent hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-accent/10 group-hover:text-accent transition-colors">
          <PenTool className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{board.name}</p>
        <VisibilityIcon visibility={board.visibility} />
      </div>
      <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
        <Briefcase className="h-3 w-3 shrink-0" />
        <span className="truncate">{board.projectName}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          {board.elementCount} {board.elementCount === 1 ? "item" : "items"}
        </span>
        {updatedLabel !== null && <span className="truncate">{updatedLabel}</span>}
      </div>
    </Link>
  );
}

function BoardGridSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, idx) => (
        <div key={idx} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 flex-1" />
          </div>
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function WhiteboardsHubPage() {
  const { data: boards, isLoading, isError, refetch } = useAllWhiteboards();

  const handleRetry = useCallback(() => refetch(), [refetch]);

  return (
    <RequireModule module="PROJECTS">
      <PageWrapper
        title="Whiteboards"
        subtitle="Every board you can access across your projects"
      >
        {isLoading ? (
          <BoardGridSkeleton />
        ) : isError ? (
          <ErrorState onRetry={handleRetry} className="flex-1" />
        ) : !boards || boards.length === 0 ? (
          <EmptyState
            illustration={<EmptyUploadIllustration />}
            title="No whiteboards yet"
            description="Boards live inside projects. Open a project and create one from its Whiteboard tab."
            action={{ label: "Go to projects", href: "/projects" }}
            className="flex-1"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {boards.map((board) => (
              <BoardCard key={board.id} board={board} />
            ))}
          </div>
        )}
      </PageWrapper>
    </RequireModule>
  );
}
