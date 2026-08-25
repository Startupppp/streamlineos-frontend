"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  KbChevronRightIcon,
  KbLoader2Icon,
} from "@/features/wiki/lib/kb-icons";
import { KNOWLEDGE_BASE, pageHref } from "@/features/wiki/lib/knowledge-routes";
import type { KbPageDetail } from "@/hooks/api/kb/pages";
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
          <span key={a.id} className="flex items-center gap-1 min-w-0">
            <KbChevronRightIcon className="h-3 w-3 shrink-0" />
            <Link
              href={pageHref(a.id)}
              className="hover:text-foreground transition-colors truncate max-w-[120px] min-w-0"
              title={a.title || "Untitled"}
            >
              {a.title || "Untitled"}
            </Link>
          </span>
        ))}
        <span className="flex items-center gap-1 shrink-0">
          <KbChevronRightIcon className="h-3 w-3" />
          <TruncatedText
            text={page.title || "Untitled"}
            className="text-foreground font-medium max-w-[200px]"
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
            className={`text-[10px] h-4 px-1.5 ${KB_STATUS_BADGE_CLASS[page.status] ?? ""}`}
          >
            {KB_STATUS_LABELS[page.status] ?? page.status}
          </Badge>
          {page.trustState === "verified" && (
            <Badge
              variant="outline"
              className="text-[10px] h-4 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
            >
              Verified
            </Badge>
          )}
          {page.trustState === "verification_expired" && (
            <Badge
              variant="outline"
              className="text-[10px] h-4 px-1.5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
            >
              Stale
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
