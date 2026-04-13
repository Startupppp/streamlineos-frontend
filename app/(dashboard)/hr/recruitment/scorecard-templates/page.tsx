"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  useScorecardTemplates,
  useCreateScorecardTemplate,
  type ScorecardCriterion,
} from "@/lib/api/hooks/hr/recruitment";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";

// ─── Criterion Row ────────────────────────────────────────────────────────────

interface CriterionRowProps {
  criterion: ScorecardCriterion & { _key: string };
  onUpdate: (key: string, field: keyof ScorecardCriterion, value: string | number) => void;
  onRemove: (key: string) => void;
  canRemove: boolean;
}

function CriterionRow({ criterion, onUpdate, onRemove, canRemove }: CriterionRowProps) {
  return (
    <div className="flex items-center gap-2 group">
      <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0 cursor-grab" aria-hidden="true" />
      <Input
        className="flex-1 h-8 text-xs"
        placeholder="Criterion name (e.g. Technical Skills)"
        value={criterion.name}
        onChange={(e) => onUpdate(criterion._key, "name", e.target.value)}
      />
      <div className="flex items-center gap-1.5 shrink-0">
        <Label className="text-[10px] text-muted-foreground">Weight</Label>
        <Input
          type="number"
          className="w-16 h-8 text-xs"
          min={1}
          max={10}
          value={criterion.weight}
          onChange={(e) => onUpdate(criterion._key, "weight", Number(e.target.value))}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity", !canRemove && "invisible")}
        onClick={() => onRemove(criterion._key)}
        aria-label="Remove criterion"
        disabled={!canRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Create Template Dialog ───────────────────────────────────────────────────

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

let keyCounter = 0;
function nextKey() { return `c-${++keyCounter}`; }
type LocalCriterion = ScorecardCriterion & { _key: string };

function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
  const [name, setName] = useState("");
  const [isBlindMode, setIsBlindMode] = useState(false);
  const [criteria, setCriteria] = useState<LocalCriterion[]>([
    { _key: nextKey(), name: "Technical Skills", weight: 3 },
    { _key: nextKey(), name: "Communication", weight: 2 },
    { _key: nextKey(), name: "Culture Fit", weight: 2 },
    { _key: nextKey(), name: "Problem Solving", weight: 3 },
  ]);

  const create = useCreateScorecardTemplate();

  const handleUpdate = useCallback(
    (key: string, field: keyof ScorecardCriterion, value: string | number) => {
      setCriteria((prev) =>
        prev.map((c) => (c._key === key ? { ...c, [field]: value } : c))
      );
    },
    []
  );

  const handleRemove = useCallback((key: string) => {
    setCriteria((prev) => prev.filter((c) => c._key !== key));
  }, []);

  const handleAdd = useCallback(() => {
    setCriteria((prev) => [...prev, { _key: nextKey(), name: "", weight: 2 }]);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) { toast.error("Template name is required"); return; }
    const filled = criteria.filter((c) => c.name.trim());
    if (filled.length === 0) { toast.error("Add at least one criterion"); return; }

    create.mutate(
      {
        name: name.trim(),
        criteria: filled.map(({ name: n, weight }) => ({ name: n.trim(), weight })),
        isBlindMode,
      },
      {
        onSuccess: () => {
          toast.success("Scorecard template created");
          onOpenChange(false);
          setName("");
          setIsBlindMode(false);
          setCriteria([
            { _key: nextKey(), name: "Technical Skills", weight: 3 },
            { _key: nextKey(), name: "Communication", weight: 2 },
            { _key: nextKey(), name: "Culture Fit", weight: 2 },
            { _key: nextKey(), name: "Problem Solving", weight: 3 },
          ]);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [name, criteria, isBlindMode, create, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Scorecard Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Template Name</Label>
            <Input
              placeholder="e.g. Engineering Round 1, HR Screen"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5 bg-muted/30">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                {isBlindMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                Blind Mode
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Hide other interviewers&apos; scores until current interviewer submits
              </p>
            </div>
            <Switch checked={isBlindMode} onCheckedChange={setIsBlindMode} aria-label="Toggle blind mode" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Criteria</Label>
              <span className="text-[11px] text-muted-foreground">Weight 1-10 (higher = more important)</span>
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
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Criterion
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCardSkeleton() {
  return <Skeleton className="h-36 w-full rounded-xl" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ScorecardTemplatesPage() {
  const { data: templates, isLoading } = useScorecardTemplates();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <PageWrapper
      title="Scorecard Templates"
      subtitle="Define evaluation criteria for each interview round"
      actions={
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Template
        </Button>
      }
    >
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => <TemplateCardSkeleton key={i} />)}
        </div>
      ) : !templates?.length ? (
        <EmptyState
          illustration={<EmptyDocumentsIllustration className="h-40 w-40" />}
          title="No Scorecard Templates"
          description="Create a template to standardize how interviewers evaluate candidates."
          action={{ label: "Create Template", onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {template.criteria.length} criteria
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {template.isActive ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Active</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Inactive</Badge>
                  )}
                  {(template as { isBlindMode?: boolean }).isBlindMode && (
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <EyeOff className="h-2.5 w-2.5" />
                      Blind
                    </Badge>
                  )}
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
          ))}
        </div>
      )}

      <CreateTemplateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </PageWrapper>
  );
}
