"use client";

import { useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Plus, Star } from "lucide-react";
import { toast } from "sonner";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  useCrmMetadata, useUpdatePipeline, useDeleteStage, useReorderStages,
  crmMetadataQueryOptions,
} from "@/hooks/api/crm";
import type { CrmPipelineWithStages, CrmPipelineStage } from "@/types/crm/metadata";
import { getErrorMessage } from "@/lib/get-error-message";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { CreatePipelineDialog } from "@/features/crm/settings/pipelines/create-pipeline-dialog";
import { StageAdvancedSheet } from "@/features/crm/settings/pipelines/stage-advanced-sheet";
import { AddStageRow } from "@/features/crm/settings/pipelines/add-stage-row";
import { StageCard } from "@/features/crm/settings/pipelines/stage-card";
import { getPipelineTypeMeta } from "@/features/crm/settings/pipelines/pipeline-constants";

export default function PipelinesPage() {
  const { data, isLoading, isError, refetch } = useCrmMetadata();
  const qc = useQueryClient();
  const updatePipeline = useUpdatePipeline();
  const deleteStage = useDeleteStage();
  const reorderStages = useReorderStages();

  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<CrmPipelineStage | null>(null);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);

  const allPipelines = data?.pipelines ?? [];
  const selectedPipeline = allPipelines.find((p) => p.id === selectedPipelineId) ?? null;
  const sortedStages = useMemo(
    () =>
      selectedPipeline
        ? [...selectedPipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [selectedPipeline],
  );

  const handleSelectPipeline = useCallback((id: string) => setSelectedPipelineId(id), []);

  const handleToggleActive = useCallback((pipeline: CrmPipelineWithStages) => {
    updatePipeline.mutate(
      { id: pipeline.id, isActive: !pipeline.isActive },
      {
        onSuccess: () => toast.success("Pipeline updated"),
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [updatePipeline]);

  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination || !selectedPipelineId) return;
    const { index: sourceIndex } = result.source;
    const destIndex = result.destination.index;
    if (sourceIndex === destIndex) return;

    qc.setQueryData(crmMetadataQueryOptions().queryKey, (old) => {
      if (!old) return old;
      const pipelines = old.pipelines.map((p) => {
        if (p.id !== selectedPipelineId) return p;
        const reordered = Array.from(p.stages).sort((a, b) => a.sortOrder - b.sortOrder);
        const [moved] = reordered.splice(sourceIndex, 1);
        if (!moved) return p;
        reordered.splice(destIndex, 0, moved);
        return { ...p, stages: reordered.map((s, i) => ({ ...s, sortOrder: i })) };
      });
      return { ...old, pipelines };
    });

    const stageIds = Array.from(sortedStages.map((s) => s.id));
    const [moved] = stageIds.splice(sourceIndex, 1);
    if (moved) stageIds.splice(destIndex, 0, moved);
    reorderStages.mutate(
      { pipelineId: selectedPipelineId, stageIds },
      { onError: (err) => toast.error(getErrorMessage(err)) }
    );
  }, [qc, selectedPipelineId, sortedStages, reorderStages]);

  const handleEditAdvanced = useCallback((stage: CrmPipelineStage) => setEditingStage(stage), []);
  const handleDeleteRequest = useCallback((id: string) => setDeleteStageId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteStageId) return;
    deleteStage.mutate(deleteStageId, {
      onSuccess: () => { toast.success("Stage deleted"); setDeleteStageId(null); },
      onError: (err) => { toast.error(getErrorMessage(err)); setDeleteStageId(null); },
    });
  }, [deleteStage, deleteStageId]);

  const handleDeleteCancel = useCallback(() => setDeleteStageId(null), []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteStageId(null); }, []);
  const handleSheetOpenChange = useCallback((open: boolean) => { if (!open) setEditingStage(null); }, []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleOpenCreate = useCallback(() => setCreateDialogOpen(true), []);

  return (
    <>
      <CreatePipelineDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <StageAdvancedSheet
        stage={editingStage}
        siblingStages={sortedStages}
        open={editingStage !== null}
        onOpenChange={handleSheetOpenChange}
      />

      <AlertDialog open={deleteStageId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stage</AlertDialogTitle>
            <AlertDialogDescription>
              This stage will be permanently deleted. Records in this stage may need to be moved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageWrapper
        title="Pipelines"
        subtitle="Configure deal and lead pipelines and their stages"
        actions={
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Pipeline
          </Button>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
        {isLoading ? (
          <div className="flex gap-4 flex-1 min-h-0">
            <div className="w-[280px] shrink-0 space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
            <div className="flex-1 space-y-2">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          </div>
        ) : isError ? (
          <EmptyState
            title="Failed to load pipelines"
            description="Something went wrong loading pipeline data."
            action={{ label: "Retry", onClick: handleRetry }}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="flex min-h-0 flex-1 gap-0 border border-border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="w-[280px] shrink-0 border-r border-border flex flex-col min-h-0">
              <div className="shrink-0 px-3 py-2.5 border-b border-border">
                <span className="text-xs font-semibold text-foreground">Pipelines</span>
              </div>
              <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
                <div className="overscroll-contain">
                {allPipelines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
                    <p className="text-xs text-muted-foreground text-center">No pipelines yet</p>
                    <Button size="sm" variant="outline" className="text-xs" onClick={handleOpenCreate}>
                      <Plus className="h-3 w-3 mr-1" />
                      New Pipeline
                    </Button>
                  </div>
                ) : (
                  allPipelines.map((pipeline) => {
                    const typeMeta = getPipelineTypeMeta(pipeline.type);
                    const isSelected = pipeline.id === selectedPipelineId;
                    return (
                      <button
                        key={pipeline.id}
                        type="button"
                        onClick={() => handleSelectPipeline(pipeline.id)}
                        className={cn(
                          "w-full text-left flex items-center gap-2 px-3 py-2.5 border-b border-border/50 transition-colors hover:bg-muted/40",
                          isSelected && "border-l-2 border-l-primary bg-primary/5 pl-[10px]"
                        )}
                      >
                        <Badge
                          variant="outline"
                          className={cn("text-micro h-4 px-1.5 py-0 shrink-0", typeMeta?.badgeClass)}
                        >
                          {typeMeta?.label}
                        </Badge>
                        <TruncatedText text={pipeline.name} className="text-xs font-medium flex-1" />
                        {pipeline.isDefault && (
                          <Star className="h-3 w-3 text-status-warning-ink shrink-0 fill-amber-400" />
                        )}
                        <Switch
                          checked={pipeline.isActive}
                          onCheckedChange={() => handleToggleActive(pipeline)}
                          className="scale-75 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </button>
                    );
                  })
                )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex-1 flex flex-col min-h-0 min-w-0">
              {!selectedPipeline ? (
                <EmptyState
                  title="Select a pipeline"
                  description="Choose a pipeline from the left to manage its stages."
                  className={cn(CONTENT_FILL_PANEL, "border-0 bg-transparent")}
                  compact
                />
              ) : (
                <>
                  <div className="shrink-0 px-4 py-2.5 border-b border-border flex items-center gap-2">
                    <span className="text-sm font-semibold">{selectedPipeline.name}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-micro h-4 px-1.5", getPipelineTypeMeta(selectedPipeline.type)?.badgeClass)}
                    >
                      {getPipelineTypeMeta(selectedPipeline.type)?.label}
                    </Badge>
                    <span className="text-dense text-muted-foreground">
                      {sortedStages.length} stage{sortedStages.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
                    <div className="overscroll-contain p-3">
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="stages">
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                            {sortedStages.length === 0 && (
                              <p className="text-xs text-muted-foreground py-4 text-center">
                                No stages yet — add one below.
                              </p>
                            )}
                            {sortedStages.map((stage, index) => (
                              <StageCard
                                key={stage.id}
                                stage={stage}
                                index={index}
                                siblingStages={sortedStages}
                                onEditAdvanced={handleEditAdvanced}
                                onDeleteRequest={handleDeleteRequest}
                              />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                    </div>
                  </ScrollArea>
                  <AddStageRow pipelineId={selectedPipeline.id} stagesCount={sortedStages.length} />
                </>
              )}
            </div>
          </div>
        )}
        </div>
      </PageWrapper>
    </>
  );
}
