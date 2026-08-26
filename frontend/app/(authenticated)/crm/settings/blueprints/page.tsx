"use client";

import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useBlueprints, useUpdateBlueprint, useCrmMetadata } from "@/hooks/api/crm";
import type { CrmBlueprint } from "@/types/crm/metadata";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { CreateBlueprintDialog } from "@/features/crm/settings/blueprints/create-blueprint-dialog";
import { TransitionMatrix } from "@/features/crm/settings/blueprints/transition-matrix";

export default function BlueprintsPage() {
  const { data: blueprints, isLoading, isError, refetch, access } = useBlueprints();
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
          <ErrorState
            title="Couldn't load blueprints"
            description="The blueprint list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : !blueprints || blueprints.length === 0 ? (
          <EmptyState
            access={access}
            title="No blueprints"
            description="Blueprints define which stage transitions are allowed and what requirements must be met."
            action={{ label: "New Blueprint", onClick: handleOpenDialog }}
            className={CONTENT_FILL_PANEL}
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
                          ? "border-l-primary bg-primary/5"
                          : "border-l-transparent"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <TruncatedText text={bp.name} className="text-xs font-medium" />
                        <TruncatedText text={getPipelineName(bp.pipelineId)} className="text-micro text-muted-foreground" />
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
                        "text-micro h-4 px-1.5",
                        selectedBlueprint.isActive
                          ? "bg-status-success-surface text-status-success-ink border-status-success-rule"
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
                      <EmptyState
                        compact
                        title="This pipeline has no stages"
                        description="A blueprint governs moves between stages, so add stages to the pipeline first."
                        action={{ label: "Edit pipeline", href: "/crm/settings/pipelines" }}
                      />
                    )}
                  </CardContent>
                </Card>
              ) : (
                <EmptyState
                  title="Select a blueprint"
                  description="Choose a blueprint from the list to configure its transition rules."
                  className={CONTENT_FILL_PANEL}
                />
              )}
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  );
}
