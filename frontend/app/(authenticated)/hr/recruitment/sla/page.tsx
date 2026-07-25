"use client";

import { useState, useCallback } from "react";
import { useInterviewSlas, useUpsertInterviewSla } from "@/hooks/api/hr";
import type { InterviewSla } from "@/hooks/api/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { toast } from "sonner";
import { Pencil, Clock, AlertCircle } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { getErrorMessage } from "@/lib/get-error-message";

const CANDIDATE_STAGES = ["NEW", "SCREENING", "INTERVIEW", "OFFER", "HIRED", "REJECTED"] as const;
type CandidateStage = (typeof CANDIDATE_STAGES)[number];

const STAGE_LABELS: Record<CandidateStage, string> = {
  NEW: "New Application",
  SCREENING: "Screening",
  INTERVIEW: "Interview",
  OFFER: "Offer Extended",
  HIRED: "Hired",
  REJECTED: "Rejected",
};

const DEFAULT_SLA: Record<CandidateStage, { maxHours: number; warningHours: number }> = {
  NEW: { maxHours: 48, warningHours: 36 },
  SCREENING: { maxHours: 72, warningHours: 48 },
  INTERVIEW: { maxHours: 96, warningHours: 72 },
  OFFER: { maxHours: 48, warningHours: 24 },
  HIRED: { maxHours: 168, warningHours: 120 },
  REJECTED: { maxHours: 24, warningHours: 12 },
};

interface SlaFormState {
  stage: string;
  maxHours: string;
  warningHours: string;
}

function slaStatusBadge(maxHours: number) {
  if (maxHours <= 48) return <Badge variant="default" className="text-xs">Strict</Badge>;
  if (maxHours <= 96) return <Badge variant="outline" className="text-xs">Moderate</Badge>;
  return <Badge variant="secondary" className="text-xs">Relaxed</Badge>;
}

interface SlaRow {
  stage: CandidateStage;
  existing: InterviewSla | undefined;
}

function SlaEditButton({ sla, onEdit }: { sla: InterviewSla; onEdit: (sla: InterviewSla) => void }) {
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onEdit(sla);
  }
  return (
    <Button variant="ghost" size="sm" className="w-7 p-0" aria-label={`Edit SLA for ${sla.stage}`} onClick={handleClick}>
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

function SlaConfigureButton({ stage, onNew }: { stage: CandidateStage; onNew: (stage: CandidateStage) => void }) {
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onNew(stage);
  }
  return (
    <AnimatedIconButton
      icon={PlusIcon}
      iconSize={14}
      variant="ghost"
      size="sm"
      className="w-7 p-0"
      aria-label={`Configure SLA for ${stage}`}
      onClick={handleClick}
    />
  );
}

function buildSlaColumns(
  onEdit: (sla: InterviewSla) => void,
  onNew: (stage: CandidateStage) => void,
): DataTableColumn<SlaRow>[] {
  return [
    {
      key: "stage",
      header: "Stage",
      cell: (row) => <span className="font-medium">{STAGE_LABELS[row.stage]}</span>,
    },
    {
      key: "warningAfter",
      header: "Warning After",
      cell: (row) =>
        row.existing ? (
          <span className="text-yellow-600 dark:text-yellow-400 font-medium">{row.existing.warningHours}h</span>
        ) : (
          <span className="text-muted-foreground text-xs">Not set</span>
        ),
    },
    {
      key: "maxHours",
      header: "Max Hours (Breach)",
      cell: (row) =>
        row.existing ? (
          <span className="text-destructive font-medium">{row.existing.maxHours}h</span>
        ) : (
          <span className="text-muted-foreground text-xs">Not set</span>
        ),
    },
    {
      key: "strictness",
      header: "Strictness",
      cell: (row) => (row.existing ? slaStatusBadge(row.existing.maxHours) : null),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) =>
        row.existing ? (
          <Badge variant="default" className="text-xs bg-green-600">Configured</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">Default</Badge>
        ),
    },
    {
      key: "action",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) =>
        row.existing ? (
          <SlaEditButton sla={row.existing} onEdit={onEdit} />
        ) : (
          <SlaConfigureButton stage={row.stage} onNew={onNew} />
        ),
    },
  ];
}

export default function SlaConfigPage() {
  const { data: slas, isLoading, isError, refetch } = useInterviewSlas();
  const upsertSla = useUpsertInterviewSla();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSla, setEditingSla] = useState<InterviewSla | null>(null);
  const [form, setForm] = useState<SlaFormState>({ stage: "", maxHours: "", warningHours: "" });

  const slaByStage = new Map<string, InterviewSla>(slas?.map((s) => [s.stage, s]) ?? []);

  const openEdit = useCallback((sla: InterviewSla) => {
    setEditingSla(sla);
    setForm({ stage: sla.stage, maxHours: String(sla.maxHours), warningHours: String(sla.warningHours) });
    setDialogOpen(true);
  }, []);

  const openNew = useCallback((stage: CandidateStage) => {
    setEditingSla(null);
    const defaults = DEFAULT_SLA[stage];
    setForm({ stage, maxHours: String(defaults.maxHours), warningHours: String(defaults.warningHours) });
    setDialogOpen(true);
  }, []);

  const handleWarningHoursChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, warningHours: e.target.value }));
  }, []);

  const handleMaxHoursChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, maxHours: e.target.value }));
  }, []);

  const handleDialogClose = useCallback(() => setDialogOpen(false), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);

  const handleSave = useCallback(() => {
    const maxHours = Number(form.maxHours);
    const warningHours = Number(form.warningHours);

    if (!form.stage) {
      toast.error("Stage is required");
      return;
    }
    if (!maxHours || maxHours <= 0) {
      toast.error("Max hours must be a positive number");
      return;
    }
    if (!warningHours || warningHours <= 0) {
      toast.error("Warning hours must be a positive number");
      return;
    }
    if (warningHours >= maxHours) {
      toast.error("Warning hours must be less than max hours");
      return;
    }

    upsertSla.mutate(
      { stage: form.stage, maxHours, warningHours },
      {
        onSuccess: () => {
          toast.success(`SLA for ${form.stage} saved`);
          setDialogOpen(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      }
    );
  }, [form, upsertSla]);

  return (
    <PageWrapper
      title="SLA Configuration"
      subtitle="Set maximum hours allowed per recruitment stage before an SLA breach is triggered"
      backHref="/hr/recruitment"
      backLabel="Back to Recruitment"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-5 flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">What are SLAs?</p>
              <p className="text-xs text-muted-foreground mt-1">
                SLAs define the maximum time a candidate should spend at each recruitment stage.
                The system will alert HR when a candidate is at risk or has breached the SLA.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-start gap-3">
            <div className="rounded-full bg-yellow-500/10 p-2">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium">At Risk</p>
              <p className="text-xs text-muted-foreground mt-1">
                A candidate is marked <span className="font-medium text-yellow-600">At Risk</span> when
                they exceed the warning threshold (e.g., 36 of 48 hours elapsed).
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-start gap-3">
            <div className="rounded-full bg-destructive/10 p-2">
              <Clock className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium">Breached</p>
              <p className="text-xs text-muted-foreground mt-1">
                A candidate is marked <span className="font-medium text-destructive">Breached</span> when
                they exceed the max hours limit. HR is immediately notified.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Stage SLA Thresholds</CardTitle>
            <CardDescription className="text-xs">
              Configure warning and maximum hours for each recruitment stage.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <AlertCircle className="w-8 text-destructive/60" />
              <p className="text-sm text-muted-foreground">Failed to load SLA configuration.</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Try again
              </Button>
            </div>
          ) : (
            <DataTable<SlaRow>
              data={CANDIDATE_STAGES.map((stage) => ({ stage, existing: slaByStage.get(stage) }))}
              columns={buildSlaColumns(openEdit, openNew)}
              getRowKey={(row) => row.stage}
              isLoading={isLoading}
              minWidth="600px"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingSla ? "Edit SLA" : "Configure SLA"} — {form.stage}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Warning After (hours)
              </label>
              <Input
                type="number"
                min={1}
                value={form.warningHours}
                onChange={handleWarningHoursChange}
                placeholder="e.g. 36"
              />
              <p className="text-xs text-muted-foreground">
                Candidate is flagged as &quot;At Risk&quot; after this many hours in the stage.
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Maximum Hours (Breach Threshold)
              </label>
              <Input
                type="number"
                min={1}
                value={form.maxHours}
                onChange={handleMaxHoursChange}
                placeholder="e.g. 48"
              />
              <p className="text-xs text-muted-foreground">
                HR is alerted and candidate is marked &quot;Breached&quot; after this many hours.
              </p>
            </div>
          </div>
          <DialogFooter className="flex-row gap-2 border-t pt-4">
            <Button variant="outline" className="flex-1" onClick={handleDialogClose}>
              Cancel
            </Button>
            <LoadingButton
              className="flex-1"
              onClick={handleSave}
              isPending={upsertSla.isPending}
              loadingText="Saving..."
            >
              Save SLA
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
