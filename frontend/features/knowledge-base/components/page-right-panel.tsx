"use client";

import { useEffect, useState } from "react";
import {
  KbFileTextIcon,
  KbPanelRightCloseIcon,
  KbPanelRightOpenIcon,
} from "@/features/knowledge-base/lib/kb-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useKbPageBacklinks } from "@/hooks/api/kb";
import { useKbPageRecordLinks } from "@/hooks/api/kb/record-links";
import type { KbPageDetail } from "@/hooks/api/kb/pages";
import { kbTimeAgo } from "@/features/knowledge-base/lib/kb-date-utils";
import {
  KB_STATUS_LABELS,
  KB_STATUS_BADGE_CLASS,
} from "@/features/knowledge-base/lib/kb-page-status";

const STORAGE_KEY = "wiki-right-panel-collapsed";

interface PageRightPanelProps {
  pageId: number;
  page: KbPageDetail;
  wordCount: number;
  onNavigate: (pageId: number) => void;
}

export default function PageRightPanel({
  pageId,
  page,
  wordCount,
  onNavigate,
}: PageRightPanelProps) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "true";
  });

  const { data: backlinks = [] } = useKbPageBacklinks(pageId);
  const { data: recordLinks = [] } = useKbPageRecordLinks(pageId);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  function handleToggle() {
    setCollapsed((prev) => !prev);
  }

  function handleBacklinkClick(id: number) {
    onNavigate(id);
  }

  return (
    <div className="hidden xl:flex flex-col shrink-0">
      <div className="sticky top-0 pt-3 flex justify-end pr-2">
        <Button
          variant="ghost"
          size="icon"
          className="w-7"
          onClick={handleToggle}
          aria-label={collapsed ? "Open details panel" : "Close details panel"}
        >
          {collapsed ? (
            <KbPanelRightOpenIcon className="h-4 w-4" />
          ) : (
            <KbPanelRightCloseIcon className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!collapsed && (
        <div className="w-64 border-l border-border overflow-y-auto pb-16 px-4 space-y-5 text-sm">
          <section>
            <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Details
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">Status</span>
                <Badge
                  variant="outline"
                  className={`text-micro h-4 px-1.5 ${KB_STATUS_BADGE_CLASS[page.status] ?? ""}`}
                >
                  {KB_STATUS_LABELS[page.status] ?? page.status}
                </Badge>
              </div>
              {page.trustState !== "unverified" && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">Trust</span>
                  <Badge
                    variant="outline"
                    className={`text-micro h-4 px-1.5 ${
                      page.trustState === "verified"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
                    }`}
                  >
                    {page.trustState === "verified" ? "Verified" : "Stale"}
                  </Badge>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">Words</span>
                <span className="text-xs text-foreground">{wordCount}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">Created</span>
                <span className="text-xs text-foreground">{kbTimeAgo(page.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">Edited</span>
                <span className="text-xs text-foreground">{kbTimeAgo(page.updatedAt)}</span>
              </div>
            </div>
          </section>

          <section>
            <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Backlinks ({backlinks.length})
            </p>
            {backlinks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No pages link here.</p>
            ) : (
              <div className="space-y-0.5">
                {backlinks.map((bl) => (
                  <button
                    key={bl.id}
                    className="flex items-center gap-1.5 w-full text-left text-xs px-1 py-1 rounded hover:bg-muted transition-colors"
                    onClick={() => handleBacklinkClick(bl.id)}
                  >
                    <span className="shrink-0 text-sm">
                      {bl.icon ?? <KbFileTextIcon className="h-3 w-3 text-muted-foreground" />}
                    </span>
                    <TruncatedText text={bl.title || "Untitled"} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <p className="text-dense font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Linked records ({recordLinks.length})
            </p>
            {recordLinks.length === 0 ? (
              <p className="text-xs text-muted-foreground">No linked records.</p>
            ) : (
              <div className="space-y-0.5">
                {recordLinks.map((rl) => (
                  <div
                    key={rl.id}
                    className="flex items-center gap-1.5 text-xs px-1 py-1"
                  >
                    <TruncatedText text={rl.label ?? rl.targetType} className="text-muted-foreground capitalize" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

