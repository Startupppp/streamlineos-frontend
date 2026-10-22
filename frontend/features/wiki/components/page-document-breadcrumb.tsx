"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  KbAlertCircleIcon,
  KbChevronRightIcon,
  KbLoader2Icon,
} from "@/features/wiki/lib/kb-icons";
import { KNOWLEDGE_BASE, KB_SPACES, pageHref, projectPageHref, spaceHref } from "@/lib/knowledge-routes";
import { useKbSpace } from "@/hooks/api/kb/spaces";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import type { PageSaveState } from "./use-page-autosave";
import {
  KB_STATUS_LABELS,
  KB_STATUS_BADGE_CLASS,
} from "@/features/wiki/lib/kb-page-status";

interface PageDocumentBreadcrumbProps {
  page: KbPageDetail;
  saveState: PageSaveState;
  savedAt?: Date | null;
  isOffline?: boolean;
  onRetrySave?: () => void;
  projectId?: number;
}

interface SpaceBreadcrumbProps {
  spaceName: string;
}

export function SpaceBreadcrumb({ spaceName }: SpaceBreadcrumbProps) {
  return (
    <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground">
      <Link href={KNOWLEDGE_BASE} className="shrink-0 transition-colors hover:text-foreground">
        Docs
      </Link>
      <KbChevronRightIcon className="h-3 w-3 shrink-0" />
      <Link href={KB_SPACES} className="shrink-0 transition-colors hover:text-foreground">
        Team folders
      </Link>
      <KbChevronRightIcon className="h-3 w-3 shrink-0" />
      <span className="min-w-0 truncate font-medium text-foreground">{spaceName}</span>
    </nav>
  );
}

function formatSavedAt(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function PageDocumentBreadcrumb({
  page,
  saveState,
  savedAt,
  isOffline,
  onRetrySave,
  projectId,
}: PageDocumentBreadcrumbProps) {
  const ancestors = page.ancestors ?? [];
  const isProjectScoped = projectId !== undefined && projectId > 0;
  const { data: space } = useKbSpace(isProjectScoped ? 0 : page.spaceId ?? 0);
  const wikiHref = isProjectScoped ? `/build/${projectId}/wiki` : KNOWLEDGE_BASE;

  function resolveAncestorHref(id: number): string {
    return isProjectScoped && projectId !== undefined
      ? projectPageHref(projectId, id)
      : pageHref(id);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
      <nav className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground">
        {isProjectScoped && (
          <>
            <Link
              href={`/build/${projectId}`}
              className="shrink-0 transition-colors hover:text-foreground"
            >
              Project
            </Link>
            <KbChevronRightIcon className="h-3 w-3 shrink-0" />
          </>
        )}
        <Link
          href={wikiHref}
          className="shrink-0 transition-colors hover:text-foreground"
        >
          Docs
        </Link>
        {space ? (
          <span className="flex min-w-0 items-center gap-1">
            <KbChevronRightIcon className="h-3 w-3 shrink-0" />
            <Link
              href={spaceHref(space.id)}
              className="max-w-[7rem] min-w-0 truncate hover:text-foreground"
              title={space.name}
            >
              {space.name}
            </Link>
          </span>
        ) : null}
        {ancestors.map((a) => (
          <span key={a.id} className="hidden min-w-0 items-center gap-1 sm:flex">
            <KbChevronRightIcon className="h-3 w-3 shrink-0" />
            <Link
              href={resolveAncestorHref(a.id)}
              className="max-w-[7rem] min-w-0 truncate hover:text-foreground"
              title={a.title || "Untitled"}
            >
              {a.title || "Untitled"}
            </Link>
          </span>
        ))}
        <span className="flex min-w-0 items-center gap-1">
          <KbChevronRightIcon className="h-3 w-3 shrink-0" />
          <TruncatedText
            text={page.title || "Untitled"}
            className="max-w-[8rem] font-medium text-foreground sm:max-w-[14rem]"
          />
        </span>
      </nav>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {isOffline && (
          <span className="flex items-center gap-1 text-xs text-status-warning-ink">
            <KbAlertCircleIcon className="h-3 w-3" />
            {saveState === "pending" || saveState === "failed" ? "Offline — edits queued" : "Offline"}
          </span>
        )}
        {!isOffline && (saveState === "pending" || saveState === "saving") && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <KbLoader2Icon className="h-3 w-3 animate-spin" />
            Saving…
          </span>
        )}
        {!isOffline && saveState === "saved" && (
          <span className="text-xs text-muted-foreground" suppressHydrationWarning>
            {savedAt ? `Saved at ${formatSavedAt(savedAt)}` : "Saved"}
          </span>
        )}
        {!isOffline && saveState === "failed" && (
          <span className="flex items-center gap-1 text-xs text-status-danger-ink" role="alert">
            <KbAlertCircleIcon className="h-3 w-3" />
            Save failed
            {onRetrySave ? (
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onRetrySave}>
                Retry
              </Button>
            ) : null}
          </span>
        )}

        {page.status ? (
          <>
            <Badge
              variant="outline"
              className={`h-5 px-1.5 text-micro ${KB_STATUS_BADGE_CLASS[page.status] ?? ""}`}
            >
              {KB_STATUS_LABELS[page.status] ?? page.status}
            </Badge>
            {page.trustState === "verified" ? (
              <Badge
                variant="outline"
                className="h-5 border-status-success-rule bg-status-success-surface px-1.5 text-micro text-status-success-ink"
              >
                Verified
              </Badge>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
