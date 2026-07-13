"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useBlueprints, useUpdateBlueprint, useCrmMetadata } from "@/hooks/api/crm";
import type { CrmBlueprint } from "@/types/crm/metadata";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { CreateBlueprintDialog } from "@/features/crm/settings/blueprints/create-blueprint-dialog";
import { TransitionMatrix } from "@/features/crm/settings/blueprints/transition-matrix";

export default function BlueprintsPage() {
  const { data: blueprints, isLoading, isError, refetch } = useBlueprints();
  const { data: metadata } = useCrmMetadata();
  const updateBlueprint = useUpdateBlueprint();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedBlueprint = blueprints?.find((b) => b.id === selectedId) ?? null;
  const selectedStages = selectedBlueprint
    ? (metadata?.pipelines.find((p) => p.id === selectedBlueprint.pipelineId)?.stages ?? [])
        .filter((s) => s.isActive)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const handleToggleActive = useCallback(
    (blueprint: CrmBlueprint) => {
      updateBlueprint.mutate(
        { id: blueprint.id, isActive: !blueprint.isActive },
        {
          onSuccess: () => toast.success("Blueprint updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [updateBlueprint]
  );

  const handleSelect = useCallback((id: string) => setSelectedId(id), []);

  const handleCreated = useCallback((id: string) => setSelectedId(id), []);

  const handleOpenDialog = useCallback(() => setDialogOpen(true), []);

  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const getPipelineName = useCallback(
    (pipelineId: string) =>
      metadata?.pipelines.find((p) => p.id === pipelineId)?.name ?? "—",
    [metadata]
  );

  return (
    <>
      <CreateBlueprintDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
      />

      <PageWrapper
        title="Blueprints"
        subtitle="Configure stage transition rules for pipelines"
        actions={
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Blueprint
          </Button>
        }
      >
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : isError ? (
          <EmptyState
            title="Failed to load blueprints"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        ) : !blueprints || blueprints.length === 0 ? (
          <EmptyState
            title="No blueprints"
            description="Blueprints define which stage transitions are allowed and what requirements must be met."
            action={{ label: "New Blueprint", onClick: handleOpenDialog }}
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        ) : (
          <div className="flex gap-4 items-start">
            <Card className="bg-card border border-border rounded-xl shadow-sm w-[250px] shrink-0">
              <CardHeader className="px-3 py-2.5">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Blueprints
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {blueprints.map((bp) => (
                    <button
                      key={bp.id}
                      type="button"
                      onClick={() => handleSelect(bp.id)}
                      className={cn(
                        "w-full text-left px-3 py-2.5 flex items-center gap-2 hover:bg-muted/40 transition-colors border-l-2",
                        selectedId === bp.id
                          ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-500/10"
                          : "border-l-transparent"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{bp.name}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {getPipelineName(bp.pipelineId)}
                        </div>
                      </div>
                      <Switch
                        checked={bp.isActive}
                        onCheckedChange={() => handleToggleActive(bp)}
                        onClick={(e) => e.stopPropagation()}
                        className="scale-75 shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex-1 min-w-0">
              {selectedBlueprint ? (
                <Card className="bg-card border border-border rounded-xl shadow-sm">
                  <CardHeader className="px-4 py-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {selectedBlueprint.name}
                      </CardTitle>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {getPipelineName(selectedBlueprint.pipelineId)}
                        {selectedBlueprint.description && (
                          <span className="ml-2">· {selectedBlueprint.description}</span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] h-4 px-1.5",
                        selectedBlueprint.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
                          : "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {selectedBlueprint.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {selectedStages.length > 0 ? (
                      <TransitionMatrix
                        blueprint={selectedBlueprint}
                        stages={selectedStages}
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground py-4 text-center">
                        No stages found for this pipeline.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <EmptyState
                  title="Select a blueprint"
                  description="Choose a blueprint from the list to configure its transition rules."
                  className="flex-1 min-h-[40vh] border-0 bg-transparent"
                />
              )}
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  );
}
