"use client";

import { useEffect, useState } from "react";
import {
  KbFileTextIcon,
  KbInfoIcon,
  KbPanelRightCloseIcon,
  KbPanelRightOpenIcon,
} from "@/features/wiki/lib/kb-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useKbPageBacklinks } from "@/hooks/api/kb";
import { useKbPageRecordLinks } from "@/hooks/api/kb/record-links";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  KB_STATUS_LABELS,
  KB_STATUS_BADGE_CLASS,
} from "@/features/wiki/lib/kb-page-status";

const STORAGE_KEY = "wiki-right-panel-collapsed";

interface PageRightPanelProps {
  pageId: number;
  page: KbPageDetail;
  wordCount: number;
  onNavigate: (pageId: number) => void;
}

interface PanelContentProps {
  pageId: number;
  page: KbPageDetail;
  wordCount: number;
  onNavigate: (pageId: number) => void;
}

function PanelContent({ pageId, page, wordCount, onNavigate }: PanelContentProps) {
  const { data: backlinks = [] } = useKbPageBacklinks(pageId);
  const { data: recordLinks = [] } = useKbPageRecordLinks(pageId);

  function handleBacklinkClick(id: number) {
    onNavigate(id);
  }

  return (
    <div className="space-y-5 text-sm px-4 pb-16">
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
                    ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
                    : "bg-status-warning-surface text-status-warning-ink border-status-warning-rule"
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
            <span className="text-xs text-foreground" suppressHydrationWarning>
              {kbTimeAgo(page.createdAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-xs">Edited</span>
            <span className="text-xs text-foreground" suppressHydrationWarning>
              {kbTimeAgo(page.updatedAt)}
            </span>
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
                type="button"
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
                <TruncatedText
                  text={rl.label ?? rl.targetType}
                  className="text-muted-foreground capitalize"
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function PageRightPanel({
  pageId,
  page,
  wordCount,
  onNavigate,
}: PageRightPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function handleToggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function handleMobileOpen() {
    setMobileSheetOpen(true);
  }

  function handleMobileSheetChange(open: boolean) {
    setMobileSheetOpen(open);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="xl:hidden fixed bottom-4 right-4 z-30 h-10 w-10 rounded-full border border-border bg-background shadow-md"
        onClick={handleMobileOpen}
        aria-label="Open details panel"
      >
        <KbInfoIcon className="h-4 w-4" />
      </Button>

      <Sheet open={mobileSheetOpen} onOpenChange={handleMobileSheetChange}>
        <SheetContent side="right" className="p-0 flex flex-col xl:hidden sm:max-w-sm">
          <SheetHeader className="px-4 py-3 border-b shrink-0">
            <SheetTitle className="text-sm">Page details</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 min-h-0 pt-4">
            <PanelContent
              pageId={pageId}
              page={page}
              wordCount={wordCount}
              onNavigate={onNavigate}
            />
          </ScrollArea>
        </SheetContent>
      </Sheet>

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
          <div className="w-64 border-l border-border overflow-y-auto">
            <PanelContent
              pageId={pageId}
              page={page}
              wordCount={wordCount}
              onNavigate={onNavigate}
            />
          </div>
        )}
      </div>
    </>
  );
}
