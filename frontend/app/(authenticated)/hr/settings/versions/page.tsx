"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { useEntityVersions } from "@/hooks/api/hr/settings-hub";
import type { VersionEntity } from "@/hooks/api/hr/settings-hub";
import { useActivatePolicy } from "@/hooks/api/hr/policies";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  archived: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
};

function formatDate(val: unknown): string {
  if (typeof val !== "string" || !val) return "—";
  return val.slice(0, 10);
}

export default function VersionHistoryPage() {
  const canView = useCan("hr:policies:view");
  const canManage = useCan("hr:policies:manage");

  const [entity, setEntity] = useState<VersionEntity>("policy");
  const [idInput, setIdInput] = useState("");
  const [queriedId, setQueriedId] = useState<number | null>(null);

  const { data, isLoading, isError } = useEntityVersions(entity, queriedId);

  const activate = useActivatePolicy();

  const handleSearch = useCallback(() => {
    const parsed = Number(idInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid numeric ID");
      return;
    }
    setQueriedId(parsed);
  }, [idInput]);

  const handleActivate = useCallback(
    (id: number) => {
      activate.mutate(id, {
        onSuccess: () => toast.success("Version activated"),
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    },
    [activate],
  );

  if (!canView) {
    return (
      <PageWrapper title="Version History" subtitle="Browse version lineage and rollback policies, templates, and workflows" variant="display">
        <NoPermissionState
          permission="hr:policies:view"
          title="Access Restricted"
          description="You don't have permission to view HR version history. HR Admin role is required."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Version History"
      subtitle="Browse version lineage and rollback policies, templates, and workflows"
 variant="display">
      <div className="flex flex-1 min-h-0 flex-col gap-4 px-4 sm:px-6 py-4">
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={entity} onValueChange={(v) => { setEntity(v as VersionEntity); setQueriedId(null); }}>
            <SelectTrigger className={cn("w-36", FILTER_SELECT_TRIGGER)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="policy" className="text-xs">Policy</SelectItem>
              <SelectItem value="template" className="text-xs">Template</SelectItem>
              <SelectItem value="workflow" className="text-xs">Workflow</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Enter ID..."
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            className="text-xs w-32"
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          />
          <Button size="sm" className="text-xs" onClick={handleSearch}>
            Load
          </Button>
        </div>

        {queriedId === null ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">Enter an entity ID to view its version history.</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">Failed to load versions.</p>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">No versions found for this {entity}.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">{data.name}</p>
            {data.items.map((item) => {
              const isActiveVersion = item.status === "active";
              const dateVal = "effectiveFrom" in item ? item.effectiveFrom : item.createdAt;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 bg-card shadow-sm ${isActiveVersion ? "border-l-2 border-l-primary bg-primary/5" : "border-border"}`}
                >
                  <span className="text-sm font-mono font-semibold w-8">v{item.version}</span>
                  <Badge variant="outline" className={`text-xs px-2 py-0.5 ${STATUS_COLORS[item.status] ?? ""}`}>
                    {item.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex-1">{formatDate(dateVal)}</span>
                  {canManage && !isActiveVersion && entity === "policy" && (
                    <LoadingButton
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      isPending={activate.isPending}
                      onClick={() => handleActivate(item.id)}
                    >
                      Activate
                    </LoadingButton>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
