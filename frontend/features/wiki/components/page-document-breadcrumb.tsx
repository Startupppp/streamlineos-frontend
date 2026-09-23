"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  KbChevronRightIcon,
  KbLoader2Icon,
} from "@/features/wiki/lib/kb-icons";
import { KNOWLEDGE_BASE, pageHref } from "@/lib/knowledge-routes";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import {
  KB_STATUS_LABELS,
  KB_STATUS_BADGE_CLASS,
} from "@/features/wiki/lib/kb-page-status";

interface PageDocumentBreadcrumbProps {
  page: KbPageDetail;
  saveState: "idle" | "pending" | "saving" | "saved";
}

export function PageDocumentBreadcrumb({
  page,
  saveState,
}: PageDocumentBreadcrumbProps) {
  const ancestors = page.ancestors ?? [];

  return (
    <div className="flex items-center gap-2 min-w-0">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap min-w-0">
        <Link
          href={KNOWLEDGE_BASE}
          className="hover:text-foreground transition-colors shrink-0"
        >
          Wiki
        </Link>
        {ancestors.map((a) => (
          <span key={a.id} className="hidden min-w-0 items-center gap-1 sm:flex">
            <KbChevronRightIcon className="h-3 w-3 shrink-0" />
            <Link
              href={pageHref(a.id)}
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

      {(saveState === "pending" || saveState === "saving") && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <KbLoader2Icon className="h-3 w-3 animate-spin" />
          Saving…
        </span>
      )}
      {saveState === "saved" && (
        <span className="text-xs text-muted-foreground shrink-0">Saved</span>
      )}

      {page.status && (
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge
            variant="outline"
            className={`text-micro h-4 px-1.5 ${KB_STATUS_BADGE_CLASS[page.status] ?? ""}`}
          >
            {KB_STATUS_LABELS[page.status] ?? page.status}
          </Badge>
          {page.trustState === "verified" && (
            <Badge
              variant="outline"
              className="text-micro h-4 px-1.5 bg-status-success-surface text-status-success-ink border-status-success-rule"
            >
              Verified
            </Badge>
          )}
          {page.coverImage && (
            <Badge variant="outline" className="text-micro h-4 px-1.5">
              Cover
            </Badge>
          )}
          {page.isFavorite && (
            <Badge variant="outline" className="text-micro h-4 px-1.5">
              Favorite
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
