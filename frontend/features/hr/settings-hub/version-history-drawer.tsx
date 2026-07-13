"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEntityVersions } from "@/hooks/api/hr/settings-hub";
import type { VersionEntity, VersionItem } from "@/hooks/api/hr/settings-hub";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-amber-50 text-amber-600 border-amber-200",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: VersionEntity;
  id: number;
  canManage: boolean;
  onActivate?: (id: number) => void;
}

function getDisplayDate(item: VersionItem): string | null {
  if ("effectiveFrom" in item && item.effectiveFrom != null) {
    return String(item.effectiveFrom);
  }
  return item.createdAt ? new Date(item.createdAt).toLocaleDateString() : null;
}

function VersionRow({
  item,
  canManage,
  onActivate,
}: {
  item: VersionItem;
  canManage: boolean;
  onActivate?: (id: number) => void;
}) {
  const isActive = item.status === "active";
  const displayDate = getDisplayDate(item);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border ${
        isActive ? "bg-blue-50/50 border-l-2 border-l-blue-500" : "bg-card"
      }`}
    >
      <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">v{item.version}</span>
      <Badge
        variant="outline"
        className={`text-xs px-2 py-0.5 shrink-0 ${STATUS_COLORS[item.status] ?? ""}`}
      >
        {item.status}
      </Badge>
      {displayDate && (
        <span className="text-xs text-muted-foreground truncate flex-1">{displayDate}</span>
      )}
      {canManage && !isActive && onActivate && (
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs px-2 shrink-0"
          onClick={() => onActivate(item.id)}
        >
          Activate
        </Button>
      )}
    </div>
  );
}

export function VersionHistoryDrawer({ open, onOpenChange, entity, id, canManage, onActivate }: Props) {
  const { data, isLoading, isError } = useEntityVersions(entity, id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="pb-4">
          <SheetTitle>Version History</SheetTitle>
          {data && (
            <p className="text-sm text-muted-foreground">{data.name}</p>
          )}
        </SheetHeader>

        <div className="flex flex-col gap-2 mt-2 overflow-y-auto">
          {isLoading ? (
            <>
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </>
          ) : isError ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Failed to load version history.
            </p>
          ) : !data || data.items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No versions found.</p>
          ) : (
            data.items.map((item) => (
              <VersionRow
                key={item.id}
                item={item}
                canManage={canManage}
                onActivate={onActivate}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
