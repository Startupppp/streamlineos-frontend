"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecruitmentEmptyState } from "@/features/hr/recruitment/components/recruitment-empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody } from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useScorecardTemplates,
  useCreateScorecardTemplate,
  useUpdateScorecardTemplate,
  useDeleteScorecardTemplate,
  type ScorecardTemplate,
  type ScorecardCriterion,
} from "@/hooks/api/hr/recruitment";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";

let keyCounter = 0;
function nextKey() { return `c-${++keyCounter}`; }
type LocalCriterion = ScorecardCriterion & { _key: string };

function makeDefaultCriteria(): LocalCriterion[] {
  return [
    { _key: nextKey(), name: "Technical Skills", weight: 3 },
    { _key: nextKey(), name: "Communication", weight: 2 },
    { _key: nextKey(), name: "Culture Fit", weight: 2 },
    { _key: nextKey(), name: "Problem Solving", weight: 3 },
  ];
}

interface CriterionRowProps {
  criterion: LocalCriterion;
  onUpdate: (key: string, field: keyof ScorecardCriterion, value: string | number) => void;
  onRemove: (key: string) => void;
  canRemove: boolean;
}

function CriterionRow({ criterion, onUpdate, onRemove, canRemove }: CriterionRowProps) {
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(criterion._key, "name", e.target.value),
    [onUpdate, criterion._key],
  );
  const handleWeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onUpdate(criterion._key, "weight", Number(e.target.value)),
    [onUpdate, criterion._key],
  );
  const handleRemoveClick = useCallback(() => onRemove(criterion._key), [onRemove, criterion._key]);

  return (
    <div className="flex items-center gap-2 group">
      <svg className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="9" cy="5" r="1" fill="currentColor" /><circle cx="15" cy="5" r="1" fill="currentColor" />
        <circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" />
        <circle cx="9" cy="19" r="1" fill="currentColor" /><circle cx="15" cy="19" r="1" fill="currentColor" />
      </svg>
      <Input
        className="flex-1 h-8 text-xs"
        placeholder="Criterion name (e.g. Technical Skills)"
        value={criterion.name}
        onChange={handleNameChange}
      />
      <div className="flex items-center gap-1.5 shrink-0">
        <Label className="text-[10px] text-muted-foreground">Weight</Label>
        <Input
          type="number"
          className="w-16 h-8 text-xs"
          min={1}
          max={10}
          value={criterion.weight}
          onChange={handleWeightChange}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn("w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity", !canRemove && "invisible")}
        onClick={handleRemoveClick}
        aria-label="Remove criterion"
        disabled={!canRemove}
        type="button"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
      </Button>
    </div>
  );
}

interface TemplateSheetProps {
  open: boolean;
  onClose: () => void;
  editTemplate?: ScorecardTemplate | null;
}

function TemplateSheet({ open, onClose, editTemplate }: TemplateSheetProps) {
  const [name, setName] = useState("");
  const [criteria, setCriteria] = useState<LocalCriterion[]>(makeDefaultCriteria());
  const create = useCreateScorecardTemplate();
  const update = useUpdateScorecardTemplate();
  const isPending = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      if (editTemplate) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(editTemplate.name);
        setCriteria(
          editTemplate.criteria.map((c) => ({ ...c, _key: nextKey() }))
        );
      } else {
        setName("");
        setCriteria(makeDefaultCriteria());
      }
    }
  }, [open, editTemplate]);

  const handleUpdate = useCallback(
    (key: string, field: keyof ScorecardCriterion, value: string | number) => {
      setCriteria((prev) => prev.map((c) => (c._key === key ? { ...c, [field]: value } : c)));
    },
    []
  );

  const handleRemove = useCallback((key: string) => {
    setCriteria((prev) => prev.filter((c) => c._key !== key));
  }, []);

  const handleAdd = useCallback(() => {
    setCriteria((prev) => [...prev, { _key: nextKey(), name: "", weight: 2 }]);
  }, []);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) { setName(e.target.value); }
  function handleSheetOpenChange(v: boolean) { if (!v) onClose(); }

  const handleSubmit = useCallback(() => {
    if (!name.trim()) { toast.error("Template name is required"); return; }
    const filled = criteria.filter((c) => c.name.trim());
    if (filled.length === 0) { toast.error("Add at least one criterion"); return; }
    const cleanCriteria = filled.map(({ name: n, weight }) => ({ name: n.trim(), weight }));

    if (editTemplate) {
      update.mutate(
        { id: editTemplate.id, name: name.trim(), criteria: cleanCriteria },
        {
          onSuccess: () => { toast.success("Template updated"); onClose(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    } else {
      create.mutate(
        { name: name.trim(), criteria: cleanCriteria },
        {
          onSuccess: () => { toast.success("Template created"); onClose(); },
          onError: (e) => toast.error(getErrorMessage(e)),
        }
      );
    }
  }, [name, criteria, editTemplate, create, update, onClose]);

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>{editTemplate ? "Edit Template" : "New Scorecard Template"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5 space-y-4">
          <div>
            <Label className="text-xs font-medium">Template Name <span className="text-destructive">*</span></Label>
            <Input
              className="mt-1"
              placeholder="e.g. Engineering Round 1, HR Screen"
              value={name}
              onChange={handleNameChange}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Criteria</Label>
              <span className="text-[11px] text-muted-foreground">Weight 1–10 (higher = more important)</span>
            </div>
            <div className="space-y-2">
              {criteria.map((c) => (
                <CriterionRow
                  key={c._key}
                  criterion={c}
                  onUpdate={handleUpdate}
                  onRemove={handleRemove}
                  canRemove={criteria.length > 1}
                />
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs border-dashed"
              onClick={handleAdd}
              type="button"
            >
              <svg className="h-3.5 w-3.5 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Criterion
            </Button>
          </div>
        </SheetBody>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending} type="button">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isPending} type="button">
            {isPending ? "Saving…" : editTemplate ? "Save Changes" : "Create Template"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}


interface TemplateCardProps {
  template: ScorecardTemplate;
  onEdit: (template: ScorecardTemplate) => void;
  onDelete: (id: number) => void;
}

function TemplateCard({ template, onEdit, onDelete }: TemplateCardProps) {
  const handleEdit = useCallback(() => onEdit(template), [onEdit, template]);
  const handleDelete = useCallback(() => onDelete(template.id), [onDelete, template.id]);

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-sm">{template.name}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {template.criteria.length} {template.criteria.length === 1 ? "criterion" : "criteria"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {template.isActive ? (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Inactive</Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="w-7"
            onClick={handleEdit}
            aria-label="Edit template"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete template"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className="flex flex-wrap gap-1">
          {template.criteria.map((c) => (
            <Badge key={c.name} variant="secondary" className="text-[10px]">
              {c.name}
              {c.weight > 1 && (
                <span className="ml-1 text-muted-foreground">×{c.weight}</span>
              )}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScorecardTemplatesPage() {
  const { data: templates, isLoading, isError, refetch } = useScorecardTemplates();
  const deleteTemplate = useDeleteScorecardTemplate();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<ScorecardTemplate | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleOpenCreate = useCallback(() => {
    setEditTemplate(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((template: ScorecardTemplate) => {
    setEditTemplate(template);
    setSheetOpen(true);
  }, []);

  const handleCloseSheet = useCallback(() => {
    setSheetOpen(false);
    setEditTemplate(null);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (deleteId == null) return;
    deleteTemplate.mutate(deleteId, {
      onSuccess: () => { toast.success("Template deleted"); setDeleteId(null); },
      onError: (e) => { toast.error(getErrorMessage(e)); setDeleteId(null); },
    });
  }, [deleteId, deleteTemplate]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteId(null);
  }, []);

  function handleRetry() { void refetch(); }

  return (
    <>
      <PageWrapper
        title="Scorecard Templates"
        subtitle="Define evaluation criteria for each interview round"
        actions={
          <Button size="sm" onClick={handleOpenCreate}>
            <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Template
          </Button>
        }
      >
        {isError ? (
          <ErrorState description="Failed to load scorecard templates" onRetry={handleRetry} />
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
          </div>
        ) : !templates?.length ? (
          <RecruitmentEmptyState
            illustration={<EmptyDocumentsIllustration />}
            title="No Scorecard Templates"
            description="Create a template to standardize how interviewers evaluate candidates."
            action={{ label: "Create Template", onClick: handleOpenCreate }}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onEdit={handleOpenEdit}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        )}
      </PageWrapper>

      <TemplateSheet
        open={sheetOpen}
        onClose={handleCloseSheet}
        editTemplate={editTemplate}
      />

      <AlertDialog open={deleteId !== null} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the scorecard template. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
