"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback, memo, useMemo } from "react";
import {
  usePulseSurveys, useCreateSurvey, useUpdateSurvey,
  type PulseSurvey,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { HrSheet } from "@/features/hr/hr-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, ClipboardList, Calendar, Play, Archive, BarChart3, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAbility } from "@/lib/abilities-context";

type SurveyStatusFilter = "all" | "DRAFT" | "ACTIVE" | "CLOSED";

const STATUS_META: Record<string, { label: string; accent: string; badge: string }> = {
  DRAFT: {
    label: "Draft",
    accent: "border-l-slate-400",
    badge: "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-300",
  },
  ACTIVE: {
    label: "Active",
    accent: "border-l-emerald-500",
    badge: "bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/40 dark:border-emerald-800 dark:text-emerald-300",
  },
  CLOSED: {
    label: "Closed",
    accent: "border-l-rose-500",
    badge: "bg-rose-100 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-300",
  },
};

interface StatusFilterButtonProps {
  value: SurveyStatusFilter;
  label: string;
  current: SurveyStatusFilter;
  onSelect: (v: SurveyStatusFilter) => void;
}

const StatusFilterButton = memo(function StatusFilterButton({ value, label, current, onSelect }: StatusFilterButtonProps) {
  const handleClick = useCallback(() => onSelect(value), [onSelect, value]);
  return (
    <button
      onClick={handleClick}
      className={cn(
        "px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200",
        current === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
});

interface SurveyCardProps {
  s: PulseSurvey;
  isAdmin: boolean;
  maxResponses: number;
  onPublish: (id: number) => void;
  onClose: (id: number) => void;
}

const SurveyCard = memo(function SurveyCard({ s, isAdmin, maxResponses, onPublish, onClose }: SurveyCardProps) {
  const status = s.status ?? "DRAFT";
  const meta = STATUS_META[status] ?? STATUS_META.DRAFT;
  const responseCount = s.responses?.length ?? 0;
  const responsePct = maxResponses > 0 ? Math.round((responseCount / maxResponses) * 100) : 0;

  const handlePublish = useCallback(() => onPublish(s.id), [onPublish, s.id]);
  const handleClose = useCallback(() => onClose(s.id), [onClose, s.id]);

  return (
    <Card className={cn(
      "rounded-2xl border border-border bg-card shadow-sm overflow-hidden",
      "border-l-4 transition-shadow duration-200 hover:shadow-md",
      meta.accent,
    )}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
              meta.badge,
            )}>
              {meta.label}
            </span>
            {s.isAnonymous && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 border-slate-200 text-slate-600 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-400">
                Anonymous
              </span>
            )}
          </div>
          <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
            <ClipboardList className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-foreground leading-tight">{s.title}</h3>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              <span>{responseCount} responses</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <ClipboardList className="h-3 w-3" />
              <span>{s.questions?.length ?? 0} questions</span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                status === "ACTIVE" ? "bg-emerald-500" : status === "CLOSED" ? "bg-rose-400" : "bg-slate-300",
              )}
              style={{ width: `${responsePct}%` }}
            />
          </div>
        </div>

        {s.closesAt && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Closes {format(new Date(s.closesAt), "MMM d, yyyy")}</span>
          </div>
        )}

        {isAdmin && status === "DRAFT" && (
          <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" onClick={handlePublish}>
            <Play className="h-3 w-3" />
            Publish Survey
          </Button>
        )}
        {isAdmin && status === "ACTIVE" && (
          <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5" onClick={handleClose}>
            <Archive className="h-3 w-3" />
            Close Survey
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

const STATUS_FILTERS: { value: SurveyStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "CLOSED", label: "Closed" },
];

export default function SurveysPage() {
  const { data: surveys, isLoading, isError, refetch } = usePulseSurveys();
  const create = useCreateSurvey();
  const update = useUpdateSurvey();
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:performance");

  const [statusFilter, setStatusFilter] = useState<SurveyStatusFilter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [closeId, setCloseId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [closesAt, setClosesAt] = useState("");

  const resetForm = useCallback(() => { setTitle(""); setClosesAt(""); }, []);

  const filteredSurveys = useMemo<PulseSurvey[]>(() => {
    if (!surveys) return [];
    if (statusFilter === "all") return surveys;
    return surveys.filter((s) => (s.status ?? "DRAFT") === statusFilter);
  }, [surveys, statusFilter]);

  const maxResponses = useMemo(() => {
    return Math.max(1, ...(filteredSurveys.map((s) => s.responses?.length ?? 0)));
  }, [filteredSurveys]);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
  const handleClosesAtChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setClosesAt(e.target.value), []);

  const handleCreate = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Survey title is required"); return; }
    if (trimmedTitle.length < 2) { toast.error("Survey title must be at least 2 characters"); return; }
    if (trimmedTitle.length > 100) { toast.error("Survey title must be at most 100 characters"); return; }
    if (closesAt) {
      const closeDate = new Date(closesAt);
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (closeDate <= today) { toast.error("Close date must be a future date"); return; }
    }
    create.mutate(
      { title: trimmedTitle, questions: [{ id: "q1", text: "How satisfied are you?", type: "rating" }], closesAt: closesAt || undefined },
      {
        onSuccess: () => {
          toast.success("Survey created"); setSheetOpen(false); resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, closesAt, create, resetForm]);

  const handlePublish = useCallback((id: number) => {
    update.mutate({ id, status: "ACTIVE" }, {
      onSuccess: () => toast.success("Survey published"),
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [update]);

  const handleCloseOpen = useCallback((id: number) => setCloseId(id), []);

  const handleClose = useCallback(() => {
    if (!closeId) return;
    update.mutate({ id: closeId, status: "CLOSED" }, {
      onSuccess: () => { toast.success("Survey closed"); setCloseId(null); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [closeId, update]);

  const handleCloseDialogChange = useCallback((open: boolean) => {
    if (!open) setCloseId(null);
  }, []);

  const handleStatusFilterChange = useCallback((v: SurveyStatusFilter) => setStatusFilter(v), []);

  if (isLoading) {
    return (
      <PageWrapper title="Pulse Surveys" subtitle="Employee engagement surveys">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Pulse Surveys" subtitle="Employee engagement surveys">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load surveys</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={refetch}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Pulse Surveys"
      subtitle="Create and manage employee engagement surveys"
      badge={`${surveys?.length ?? 0} surveys`}
      actions={
        isAdmin ? (
          <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
            <Plus className="h-3.5 w-3.5" />
            Create Survey
          </Button>
        ) : undefined
      }
      filters={
        <div className="flex items-center gap-1 rounded-lg border p-1">
          {STATUS_FILTERS.map((f) => (
            <StatusFilterButton
              key={f.value}
              value={f.value}
              label={f.label}
              current={statusFilter}
              onSelect={handleStatusFilterChange}
            />
          ))}
        </div>
      }
    >
      {!filteredSurveys.length ? (
        <EmptyState
          illustration={<ClipboardList className="h-8 w-8 text-muted-foreground" />}
          title={statusFilter === "all" ? "No surveys yet" : `No ${statusFilter.toLowerCase()} surveys`}
          description={statusFilter === "all" ? "Create your first pulse survey to gather employee feedback." : undefined}
          action={isAdmin && statusFilter === "all" ? { label: "Create Survey", onClick: handleOpenSheet } : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSurveys.map((s) => (
            <SurveyCard
              key={s.id}
              s={s}
              isAdmin={isAdmin}
              maxResponses={maxResponses}
              onPublish={handlePublish}
              onClose={handleCloseOpen}
            />
          ))}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Create Survey"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Survey Title <span className="text-destructive">*</span></label>
          <Input placeholder="e.g., Q1 Engagement Survey" value={title} onChange={handleTitleChange} maxLength={100} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Closes At</label>
          <Input type="date" value={closesAt} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} onChange={handleClosesAtChange} />
        </div>
        <p className="text-xs text-muted-foreground">A default satisfaction question will be added. Edit questions after creation.</p>
      </HrSheet>

      <ConfirmDialog
        open={closeId !== null}
        onOpenChange={handleCloseDialogChange}
        title="Close Survey"
        description="Close this survey? No more responses will be accepted."
        confirmLabel="Close"
        onConfirm={handleClose}
        isPending={update.isPending}
      />
    </PageWrapper>
  );
}
