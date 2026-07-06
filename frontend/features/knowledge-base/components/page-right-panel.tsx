"use client";

import { useEffect, useState } from "react";
import {
  KbFileTextIcon,
  KbPanelRightCloseIcon,
  KbPanelRightOpenIcon,
} from "@/features/knowledge-base/lib/kb-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useKbPageBacklinks } from "@/hooks/api/kb";
import { useKbPageRecordLinks } from "@/hooks/api/kb/record-links";
import type { KbPageDetail } from "@/hooks/api/kb/pages";
import PageAskAi from "./page-ask-ai";

const STORAGE_KEY = "wiki-right-panel-collapsed";

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

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  published: "Published",
  archived: "Archived",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  in_review: "bg-amber-50 text-amber-700 border-amber-200",
  published: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200 opacity-60",
};

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
          className="h-7 w-7"
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
          <PageAskAi spaceId={page.spaceId} onNavigate={onNavigate} />

          <section>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Details
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">Status</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] h-4 px-1.5 ${STATUS_CLASS[page.status] ?? ""}`}
                >
                  {STATUS_LABELS[page.status] ?? page.status}
                </Badge>
              </div>
              {page.trustState !== "unverified" && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground text-xs">Trust</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-4 px-1.5 ${
                      page.trustState === "verified"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
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
                <span className="text-xs text-foreground">{timeAgo(page.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground text-xs">Edited</span>
                <span className="text-xs text-foreground">{timeAgo(page.updatedAt)}</span>
              </div>
            </div>
          </section>

          <section>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
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
                    <span className="truncate">{bl.title || "Untitled"}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
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
                    <span className="truncate text-muted-foreground capitalize">
                      {rl.label ?? rl.targetType}
                    </span>
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

