"use client";

import { useCallback } from "react";
import { ClipboardList, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/common/use-mobile";
import { useModuleAuditLog, type AuditLogEntry } from "@/hooks/api/module-access";

const PAGE_SIZE = 15;

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function resolveActorName(entry: AuditLogEntry): string {
  return entry.actorName || entry.actorEmail || "Unknown user";
}

function resolveTargetName(entry: AuditLogEntry): string | null {
  if (entry.targetName) return entry.targetName;
  if (entry.metadata && typeof entry.metadata.name === "string") return entry.metadata.name;
  if (!entry.targetType) return null;
  return entry.targetType === "user" ? "Organization member" : "Module role";
}

function AuditEntryRowSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-border/60 space-y-1.5">
      <Skeleton className="h-3.5 w-48" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

function AuditEntryRow({ entry }: { entry: AuditLogEntry }) {
  const actorName = resolveActorName(entry);
  const targetName = resolveTargetName(entry);
  return (
    <div className="px-4 py-3 border-b border-border/60 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{entry.action}</p>
          <p className="text-dense text-muted-foreground mt-0.5">
            By {actorName}
            {targetName ? ` · ${targetName}` : ""}
          </p>
        </div>
        <time
          className="text-dense text-muted-foreground shrink-0 tabular-nums"
          dateTime={entry.createdAt}
        >
          {formatRelativeTime(entry.createdAt)}
        </time>
      </div>
    </div>
  );
}

interface AuditLogBodyProps {
  moduleKey: string;
  open: boolean;
}

function AuditLogBody({ moduleKey, open }: AuditLogBodyProps) {
  const auditQuery = useModuleAuditLog(moduleKey, PAGE_SIZE, { enabled: open });

  const entries = auditQuery.data?.pages.flatMap((p) => p.data) ?? [];

  const handleLoadMore = useCallback(() => {
    void auditQuery.fetchNextPage();
  }, [auditQuery]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {auditQuery.isLoading ? (
        <div className="divide-y divide-border/60 flex-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <AuditEntryRowSkeleton key={i} />
          ))}
        </div>
      ) : auditQuery.isError ? (
        <EmptyState
          illustrationPreset="permissions"
          title="Failed to load audit log"
          description="Check your connection and try again."
          action={{
            label: "Retry",
            onClick: () => void auditQuery.refetch(),
          }}
          compact
          className="border-0 bg-transparent flex-1"
        />
      ) : entries.length === 0 ? (
        <EmptyState
          illustrationPreset="permissions"
          title="No audit events yet"
          description="Access changes will appear here."
          compact
          className="border-0 bg-transparent flex-1"
        />
      ) : (
        <>
          <div className="flex-1 overflow-y-auto">
            {entries.map((entry) => (
              <AuditEntryRow
                key={String(entry.id)}
                entry={entry}
              />
            ))}
          </div>
          {auditQuery.hasNextPage ? (
            <div className="border-t border-border/60 px-4 py-3 flex justify-center shrink-0">
              <LoadingButton
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                isPending={auditQuery.isFetchingNextPage}
              >
                Load more
              </LoadingButton>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

interface AuditLogDrawerProps {
  moduleKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDrawer({
  moduleKey,
  open,
  onOpenChange,
}: AuditLogDrawerProps) {
  const isMobile = useIsMobile();

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent className="flex flex-col max-h-[90dvh]">
          <DrawerHeader className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              Audit Log
            </DrawerTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerHeader>
          <AuditLogBody moduleKey={moduleKey} open={open} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
        showCloseButton={false}
      >
        <SheetHeader className="flex flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Audit Log
          </SheetTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            onClick={handleClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>
        <AuditLogBody moduleKey={moduleKey} open={open} />
      </SheetContent>
    </Sheet>
  );
}
