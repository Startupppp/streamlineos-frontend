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
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useKbPageBacklinks } from "@/hooks/api/kb";
import { useKbPageRecordLinks } from "@/hooks/api/kb/record-links";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import {
  KB_STATUS_LABELS,
  KB_STATUS_BADGE_CLASS,
} from "@/features/wiki/lib/kb-page-status";
import { cn } from "@/lib/utils";

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

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("h-5 px-1.5 text-micro", KB_STATUS_BADGE_CLASS[status])}
    >
      {KB_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function Stat({
  label,
  value,
  suppressHydrationWarning,
}: {
  label: string;
  value: string;
  suppressHydrationWarning?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className="mt-0.5 truncate text-sm tabular-nums text-foreground"
        suppressHydrationWarning={suppressHydrationWarning}
      >
        {value}
      </p>
    </div>
  );
}

function PanelContent({ pageId, page, wordCount, onNavigate }: PanelContentProps) {
  const { data: backlinks = [] } = useKbPageBacklinks(pageId);
  const { data: recordLinks = [] } = useKbPageRecordLinks(pageId);

  function handleBacklinkClick(event: React.MouseEvent<HTMLButtonElement>) {
    const id = Number(event.currentTarget.dataset.pageId);
    if (!Number.isFinite(id)) return;
    onNavigate(id);
  }

  const trustLabel =
    page.trustState === "verified"
      ? "Verified"
      : page.trustState === "verification_expired"
        ? "Stale"
        : null;

  return (
    <div className="flex flex-col gap-5 px-4 py-4">
      <section className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={page.status} />
            {trustLabel ? (
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 text-micro",
                  page.trustState === "verified"
                    ? "border-status-success-rule bg-status-success-surface text-status-success-ink"
                    : "border-status-warning-rule bg-status-warning-surface text-status-warning-ink",
                )}
              >
                {trustLabel}
              </Badge>
            ) : null}
          </div>
        </div>
        <Stat label="Words" value={wordCount.toLocaleString()} />
        <Stat label="Created" value={kbTimeAgo(page.createdAt)} suppressHydrationWarning />
        <Stat label="Edited" value={kbTimeAgo(page.updatedAt)} suppressHydrationWarning />
      </section>

      <section className="border-t border-border/70 pt-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">Backlinks</h3>
          <span className="text-xs tabular-nums text-muted-foreground">{backlinks.length}</span>
        </div>
        {backlinks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No pages link here.</p>
        ) : (
          <ul className="flex flex-col">
            {backlinks.map((bl) => (
              <li key={bl.id}>
                <button
                  type="button"
                  data-page-id={bl.id}
                  className="flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={handleBacklinkClick}
                >
                  <span className="shrink-0 text-sm leading-none">
                    {bl.icon ?? <KbFileTextIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                  <TruncatedText text={bl.title || "Untitled"} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-border/70 pt-4">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-medium text-foreground">Linked records</h3>
          <span className="text-xs tabular-nums text-muted-foreground">{recordLinks.length}</span>
        </div>
        {recordLinks.length === 0 ? (
          <p className="text-xs text-muted-foreground">No linked records.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {recordLinks.map((rl) => (
              <li key={rl.id} className="px-1.5 py-1 text-sm text-foreground">
                <TruncatedText text={rl.label ?? rl.targetType} className="capitalize" />
              </li>
            ))}
          </ul>
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
  const title = page.title || "Untitled";

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
        className="fixed right-4 bottom-4 z-30 h-10 w-10 rounded-full border border-border bg-background shadow-md xl:hidden"
        onClick={handleMobileOpen}
        aria-label="Open details panel"
      >
        <KbInfoIcon className="h-4 w-4" />
      </Button>

      <Sheet open={mobileSheetOpen} onOpenChange={handleMobileSheetChange}>
        <SheetContent side="right" className="gap-0 p-0 xl:hidden sm:max-w-sm">
          <SheetHeader className="border-b border-border px-4 py-3 pr-12">
            <SheetDescription className="text-xs">Page details</SheetDescription>
            <SheetTitle className="truncate text-base leading-tight">{title}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            <PanelContent
              pageId={pageId}
              page={page}
              wordCount={wordCount}
              onNavigate={onNavigate}
            />
          </SheetBody>
        </SheetContent>
      </Sheet>

      <div className="hidden shrink-0 flex-col xl:flex">
        {!collapsed ? (
          <div className="flex w-64 flex-col border-l border-border">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium text-foreground">{title}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={handleToggle}
                aria-label="Close details panel"
              >
                <KbPanelRightCloseIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PanelContent
                pageId={pageId}
                page={page}
                wordCount={wordCount}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        ) : (
          <div className="sticky top-0 pt-3 pr-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleToggle}
              aria-label="Open details panel"
            >
              <KbPanelRightOpenIcon className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
