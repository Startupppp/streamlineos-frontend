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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { ErrorState } from "@/components/shared";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useEntityVersions } from "@/hooks/api/hr/settings-hub";
import type { VersionEntity } from "@/hooks/api/hr/settings-hub";
import { useActivatePolicy } from "@/hooks/api/hr/policies";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

const VERSION_ENTITIES = [
  "policy",
  "template",
  "workflow",
] as const satisfies readonly VersionEntity[];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  active: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  archived: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
};

function formatDate(val: unknown): string {
  if (typeof val !== "string" || !val) return "—";
  return val.slice(0, 10);
}

interface ActivateVersionButtonProps {
  versionId: number;
  isPending: boolean;
  disabled: boolean;
  onActivate: (id: number) => void;
}

function ActivateVersionButton({ versionId, isPending, disabled, onActivate }: ActivateVersionButtonProps) {
  function handleClick() {
    onActivate(versionId);
  }
  return (
    <LoadingButton size="sm" variant="outline" isPending={isPending} disabled={disabled} onClick={handleClick}>
      Activate
    </LoadingButton>
  );
}

export function PolicyVersionsPage() {
  const canManage = useCan("hr:policies:manage");

  const [entity, setEntity] = useState<VersionEntity>("policy");
  const [idInput, setIdInput] = useState("");
  const [queriedId, setQueriedId] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch } = useEntityVersions(entity, queriedId);

  const activate = useActivatePolicy();

  function handleEntityChange(v: string) {
    const next = VERSION_ENTITIES.find((candidate) => candidate === v);
    if (!next) return;
    setEntity(next);
    setQueriedId(null);
  }

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const pageState = usePageState({ permission: "hr:policies:view", isLoading: false, isError, error });

  const handleSearch = useCallback(() => {
    const parsed = Number(idInput);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid numeric ID");
      return;
    }
    setQueriedId(parsed);
  }, [idInput]);

  function handleIdInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setIdInput(e.target.value);
  }

  function handleIdKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSearch();
  }

  const [activatingId, setActivatingId] = useState<number | null>(null);

  const handleActivate = useCallback(
    (id: number) => {
      setActivatingId(id);
      activate.mutate(id, {
        onSuccess: () => toast.success("Version activated"),
        onError: (err) => toast.error(getErrorMessage(err)),
        onSettled: () => setActivatingId(null),
      });
    },
    [activate],
  );

  return (
    <PageWrapper
      title="Version History"
      subtitle="Browse version lineage and rollback policies, templates, and workflows"
    >
      <PageState resolution={pageState} loading={null} onRetry={handleRetry} className="flex-1">
      <div className="flex flex-1 min-h-0 flex-col gap-4 py-4">
        <div className={FILTER_TOOLBAR_ROW}>
          <Select
            value={entity}
            onValueChange={handleEntityChange}
          >
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
            onChange={handleIdInputChange}
            className="w-32"
            inputMode="numeric"
            aria-label={`${entity} ID`}
            onKeyDown={handleIdKeyDown}
          />
          <Button type="button" size="sm" onClick={handleSearch}>
            View history
          </Button>
        </div>

        {queriedId === null ? (
          <EmptyState
            className="flex-1"
            illustrationPreset="search"
            title="No entity selected"
            description="Pick an entity type and enter its ID above to view the version history."
          />
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load versions"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            className="flex-1"
            illustrationPreset="documents"
            title={`No versions for this ${entity}`}
            description={`Nothing has been versioned against this ${entity} ID yet. Check the ID, or create a version from the ${entity} itself.`}
          />
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
                    <ActivateVersionButton
                      versionId={item.id}
                      isPending={activate.isPending && activatingId === item.id}
                      disabled={activate.isPending}
                      onActivate={handleActivate}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      </PageState>
    </PageWrapper>
  );
}
