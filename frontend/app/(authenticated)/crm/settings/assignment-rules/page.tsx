"use client";

import { useState, useCallback } from "react";
import {
  DragDropContext, Droppable, Draggable, type DropResult,
  type DraggableProvidedDragHandleProps,
} from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyTargetIllustration } from "@/components/illustrations";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, GripVertical, Eye, CheckCircle2, XCircle } from "lucide-react";
import { UserPenIcon, Trash2Icon } from "@animateicons/react/lucide";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { CrmOptionSelect } from "@/features/crm/shared/metadata/crm-option-select";
import { AssignmentRuleSheet, buildRulePayload, type RuleFormValues } from "@/features/crm/settings/assignment-rule-sheet";
import {
  useAssignmentRules,
  useCreateAssignmentRule,
  useUpdateAssignmentRule,
  useDeleteAssignmentRule,
  useReorderAssignmentRules,
  usePreviewAssignmentRule,
  type AssignmentRule,
  type AssignmentType,
} from "@/hooks/api/crm-settings";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

const ASSIGNMENT_TYPE_LABELS: Record<AssignmentType, string> = {
  assign_user: "Assign User",
  round_robin: "Round Robin",
  weighted_round_robin: "Weighted RR",
  least_loaded: "Least Loaded",
  territory: "Territory",
};

interface RuleRowProps {
  rule: AssignmentRule;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  onToggle: (id: number, current: boolean) => void;
  onEdit: (rule: AssignmentRule) => void;
  onDeleteRequest: (id: number) => void;
}

function RuleRow({ rule, dragHandleProps, onToggle, onEdit, onDeleteRequest }: RuleRowProps) {
  const editIcon = useAnimatedIcon();
  const deleteIcon = useAnimatedIcon();
  const handleToggle = useCallback(() => onToggle(rule.id, rule.isActive), [rule.id, rule.isActive, onToggle]);
  const handleEdit = useCallback(() => onEdit(rule), [rule, onEdit]);
  const handleDelete = useCallback(() => onDeleteRequest(rule.id), [rule.id, onDeleteRequest]);

  return (
    <Card className={cn("bg-card rounded-lg border border-border shadow-sm transition-shadow", !rule.isActive && "opacity-60")}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div
            {...(dragHandleProps ?? {})}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <TruncatedText text={rule.name} className="text-sm font-medium" />
              <Badge variant="outline" className="text-micro h-4 px-1.5 py-0 bg-primary/10 text-foreground border-primary/30">
                {ASSIGNMENT_TYPE_LABELS[rule.assignmentType] ?? rule.assignmentType}
              </Badge>
              <Badge variant="outline" className="text-micro h-4 px-1.5 py-0 bg-muted text-muted-foreground border-border">
                Priority {rule.priority}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch checked={rule.isActive} onCheckedChange={handleToggle} />
            <Button
              variant="ghost"
              size="icon"
              className="w-7"
              onClick={handleEdit}
              aria-label="Edit rule"
              {...editIcon.hoverHandlers}
            >
              <UserPenIcon ref={editIcon.iconRef} size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 text-destructive"
              onClick={handleDelete}
              aria-label="Delete rule"
              {...deleteIcon.hoverHandlers}
            >
              <Trash2Icon ref={deleteIcon.iconRef} size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PreviewPanel() {
  const [source, setSource] = useState("");
  const [priority, setPriority] = useState("");
  const [score, setScore] = useState("");
  const [city, setCity] = useState("");
  const previewRule = usePreviewAssignmentRule();

  const handleRunPreview = useCallback(() => {
    previewRule.mutate(
      {
        source: source || undefined,
        priority: priority || undefined,
        score: score ? Number(score) : undefined,
        city: city || undefined,
      },
      { onError: (err) => toast.error(getErrorMessage(err)) }
    );
  }, [previewRule, source, priority, score, city]);

  const handleScoreChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setScore(e.target.value), []);
  const handleCityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setCity(e.target.value), []);

  return (
    <Card className="bg-card rounded-lg border border-border shadow-sm sticky top-4">
      <CardHeader className="px-4 py-3 border-b border-border">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          Assignment Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-4 space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Lead Source</label>
            <CrmOptionSelect
              type="source"
              value={source}
              onChange={setSource}
              placeholder="Select source…"
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">Lead Priority</label>
            <CrmOptionSelect
              type="priority"
              value={priority}
              onChange={setPriority}
              placeholder="Select priority…"
              className="w-full"
            />
          </div>
          <div>
            <label htmlFor="preview-lead-score" className="text-xs font-medium mb-1 block">Lead Score</label>
            <Input
              id="preview-lead-score"
              type="number"
              value={score}
              onChange={handleScoreChange}
              placeholder="85"
              className="text-xs"
            />
          </div>
          <div>
            <label htmlFor="preview-city" className="text-xs font-medium mb-1 block">City</label>
            <Input
              id="preview-city"
              value={city}
              onChange={handleCityChange}
              placeholder="Mumbai"
              className="text-xs"
            />
          </div>
        </div>
        <LoadingButton
          type="button"
          size="sm"
          onClick={handleRunPreview}
          isPending={previewRule.isPending}
          loadingText="Running…"
          className="w-full"
        >
          Preview Assignment
        </LoadingButton>
        {previewRule.data && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs space-y-2">
            <p className="font-semibold text-micro uppercase tracking-wide text-muted-foreground">Trace</p>
            {previewRule.data.trace.map((step) => (
              <div key={step.ruleId} className="flex items-start gap-2">
                {step.matched
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-status-success-ink shrink-0 mt-0.5" />
                  : <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                <div>
                  <span className="font-medium">{step.ruleName}</span>
                  <span className="text-muted-foreground ml-1">— {step.reason}</span>
                </div>
              </div>
            ))}
            <div className="pt-1 border-t border-border">
              {previewRule.data.wouldAssignTo ? (
                <span className="text-status-success-ink font-medium">Assign to: {previewRule.data.wouldAssignTo}</span>
              ) : (
                <span className="text-muted-foreground">No rule matched</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AssignmentRulesPage() {
  const qc = useQueryClient();
  const { data: rules, isLoading, isError, refetch, access } = useAssignmentRules();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AssignmentRule | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createRule = useCreateAssignmentRule();
  const updateRule = useUpdateAssignmentRule();
  const deleteRule = useDeleteAssignmentRule();
  const reorderRules = useReorderAssignmentRules();

  const handleOpenCreate = useCallback(() => {
    setEditing(null);
    setSheetOpen(true);
  }, []);

  const handleEdit = useCallback((rule: AssignmentRule) => {
    setEditing(rule);
    setSheetOpen(true);
  }, []);

  const handleSheetSubmit = useCallback(
    (data: RuleFormValues) => {
      const payload = buildRulePayload(data);
      if (editing) {
        updateRule.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => { toast.success("Rule updated"); setSheetOpen(false); },
            onError: (err) => toast.error(getErrorMessage(err)),
          }
        );
      } else {
        createRule.mutate(
          { ...payload, priority: rules?.length ?? 0 },
          {
            onSuccess: () => { toast.success("Rule created"); setSheetOpen(false); },
            onError: (err) => toast.error(getErrorMessage(err)),
          }
        );
      }
    },
    [editing, updateRule, createRule, rules]
  );

  const handleToggleActive = useCallback(
    (id: number, current: boolean) => {
      updateRule.mutate(
        { id, isActive: !current },
        {
          onSuccess: () => toast.success("Rule updated"),
          onError: (err) => toast.error(getErrorMessage(err)),
        }
      );
    },
    [updateRule]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination || !rules) return;
      const working = Array.from(rules);
      const [moved] = working.splice(result.source.index, 1);
      if (!moved) return;
      working.splice(result.destination.index, 0, moved);
      const reordered = working.map((rule, index) => ({ ...rule, priority: working.length - index }));
      qc.setQueryData(queryKeys.crmSettings.assignmentRules(), reordered);
      reorderRules.mutate(
        { ruleIds: reordered.map((r) => r.id) },
        {
          onError: (err) => {
            toast.error(getErrorMessage(err));
            qc.invalidateQueries({ queryKey: queryKeys.crmSettings.assignmentRules() });
          },
        }
      );
    },
    [rules, reorderRules, qc]
  );

  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deleteRule.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Rule deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(getErrorMessage(err)); setDeleteTargetId(null); },
    });
  }, [deleteRule, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) handleDeleteCancel(); }, [handleDeleteCancel]);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const isPending = createRule.isPending || updateRule.isPending;

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Assignment Rule</AlertDialogTitle>
            <AlertDialogDescription>
              This rule will be permanently deleted and leads will no longer be auto-assigned by it.
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

      <AssignmentRuleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        isPending={isPending}
        onSubmit={handleSheetSubmit}
      />

      <PageWrapper
        title="Assignment Rules"
        subtitle="Auto-assign incoming leads based on conditions"
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        }
      >
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
            <Skeleton className="h-80 w-full" />
          </div>
        ) : isError ? (
          <ErrorState
            title="Couldn't load assignment rules"
            description="The rule list didn't load. Check your connection and try again."
            onRetry={handleRetry}
            className={CONTENT_FILL_PANEL}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <div>
              {rules && rules.length > 0 ? (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="assignment-rules">
                    {(provided) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                        {rules.map((rule, index) => (
                          <Draggable key={rule.id} draggableId={String(rule.id)} index={index}>
                            {(dp) => (
                              <div ref={dp.innerRef} {...dp.draggableProps}>
                                <RuleRow
                                  rule={rule}
                                  dragHandleProps={dp.dragHandleProps}
                                  onToggle={handleToggleActive}
                                  onEdit={handleEdit}
                                  onDeleteRequest={handleDeleteRequest}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              ) : (
                <EmptyState
                  access={access}
                  illustration={<EmptyTargetIllustration />}
                  title="No assignment rules"
                  description="Create rules to automatically assign incoming leads to the right people."
                  action={{ label: "New Rule", onClick: handleOpenCreate }}
                  className={CONTENT_FILL_PANEL}
                />
              )}
            </div>
            <PreviewPanel />
          </div>
        )}
      </PageWrapper>
    </>
  );
}
