"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, History, RotateCcw, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { getApiError } from "@/lib/api-client";
import {
  useKbArticleVersions,
  useRestoreKbArticleVersion,
} from "@/hooks/api/kb/versions";
import type { KbArticleVersion } from "@/types/kb";

function VersionSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-20" />
              </div>
            </div>
            <Skeleton className="h-8 w-20 shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface VersionCardProps {
  version: KbArticleVersion;
  isLatest: boolean;
  articleId: number;
}

function VersionCard({ version, isLatest, articleId }: VersionCardProps) {
  const restore = useRestoreKbArticleVersion();

  function handleRestore() {
    restore.mutate(
      { articleId, versionNumber: version.versionNumber },
      {
        onSuccess: () => toast.success(`Restored to version ${version.versionNumber}`),
        onError: (err) => toast.error(getApiError(err)),
      },
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isLatest ? "default" : "secondary"} className="shrink-0 text-[11px]">
              v{version.versionNumber}
              {isLatest && " · Current"}
            </Badge>
            <span className="min-w-0 truncate text-sm font-medium text-foreground">
              {version.title}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {version.authorId && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {version.authorId}
              </span>
            )}
            <span>{format(new Date(version.createdAt), "MMM d, yyyy 'at' h:mm a")}</span>
          </div>

          {version.changeSummary && (
            <p className="text-xs text-muted-foreground">{version.changeSummary}</p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={isLatest || restore.isPending}
          onClick={handleRestore}
          className="shrink-0"
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Restore
        </Button>
      </div>
    </div>
  );
}

export default function KbArticleVersionsPage() {
  const params = useParams<{ spaceId: string; articleId: string }>();
  const spaceId = Number(params.spaceId);
  const articleId = Number(params.articleId);

  const versionsQuery = useKbArticleVersions(articleId);
  const versions = versionsQuery.data ?? [];

  function handleRetryVersions() {
    void versionsQuery.refetch();
  }

  const latestVersionNumber =
    versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber)) : -1;

  const backHref = `/knowledge-base/spaces/${spaceId}/articles/${articleId}`;

  return (
    <PageWrapper
      title="Version History"
      subtitle="Browse and restore previous versions of this article."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href={backHref}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to article
          </Link>
        </Button>
      }
    >
      {versionsQuery.isLoading && <VersionSkeleton />}

      {versionsQuery.isError && !versionsQuery.isLoading && (
        <ErrorState
          title="Couldn't load version history"
          description={getApiError(versionsQuery.error)}
          onRetry={handleRetryVersions}
        />
      )}

      {!versionsQuery.isLoading && !versionsQuery.isError && versions.length === 0 && (
        <div className="flex flex-1 items-center justify-center py-20">
          <EmptyState
            illustration={<History className="h-14 w-14 text-muted-foreground/40" />}
            title="No version history yet"
            description="Versions are saved automatically as this article is edited and published."
            action={{ label: "Back to article", href: backHref }}
            className="w-full max-w-sm"
          />
        </div>
      )}

      {!versionsQuery.isLoading && !versionsQuery.isError && versions.length > 0 && (
        <div className="space-y-3">
          {versions.map((version) => (
            <VersionCard
              key={version.id}
              version={version}
              isLatest={version.versionNumber === latestVersionNumber}
              articleId={articleId}
            />
          ))}
        </div>
      )}
    </PageWrapper>
  );
}
