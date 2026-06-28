"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import {
  useAssessments, useCreateAssessment,
  type Assessment, type AssessmentAttempt, type AssessStatus,
} from "@/lib/api/hooks/hr";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HrSheet } from "@/features/hr/hr-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Plus, ClipboardCheck, Clock, Users, CheckCircle2, Minus, AlertCircle } from "lucide-react";
import { useAbility } from "@/lib/abilities-context";
import { cn } from "@/lib/utils";

function deriveStatus(attempts: AssessmentAttempt[]): AssessStatus {
  if (!attempts || attempts.length === 0) return "NOT_STARTED";
  const latest = attempts[attempts.length - 1];
  if (latest.score !== null) return "COMPLETED";
  return "IN_PROGRESS";
}

function getStatusConfig(status: AssessStatus) {
  if (status === "COMPLETED") {
    return {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      accent: "border-l-emerald-500",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
      label: "Completed",
    };
  }
  if (status === "IN_PROGRESS") {
    return {
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      accent: "border-l-amber-500",
      icon: <Clock className="h-2.5 w-2.5" />,
      label: "In Progress",
    };
  }
  return {
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800",
    accent: "border-l-slate-400",
    icon: <Minus className="h-2.5 w-2.5" />,
    label: "Not Started",
  };
}

export default function AssessmentsPage() {
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:performance");

  const { data: items, isLoading, isError, refetch } = useAssessments();
  const create = useCreateAssessment();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [skillName, setSkillName] = useState("");
  const [duration, setDuration] = useState("30");

  const resetForm = useCallback(() => {
    setTitle("");
    setSkillName("");
    setDuration("30");
  }, []);

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
  const handleSkillNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSkillName(e.target.value), []);
  const handleDurationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setDuration(e.target.value), []);

  const handleCreate = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Title is required"); return; }
    if (trimmedTitle.length < 2) { toast.error("Title must be at least 2 characters"); return; }
    if (trimmedTitle.length > 200) { toast.error("Title must be at most 200 characters"); return; }
    const numDuration = Number(duration);
    if (duration && (!Number.isInteger(numDuration) || numDuration < 1 || numDuration > 480)) {
      toast.error("Duration must be a whole number between 1 and 480 minutes");
      return;
    }
    create.mutate(
      {
        title: trimmedTitle,
        skillName: skillName.trim() || undefined,
        durationMinutes: numDuration || 30,
      },
      {
        onSuccess: () => {
          toast.success("Assessment created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, skillName, duration, create, resetForm]);

  if (isLoading) {
    return (
      <PageWrapper title="Skills Assessments" subtitle="Skills assessments and quizzes">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Skills Assessments" subtitle="Skills assessments and quizzes">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load assessments</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={refetch}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Skills Assessments"
      subtitle="Create and take skill assessment quizzes"
      badge={`${items?.length ?? 0} assessments`}
      actions={
        isAdmin ? (
          <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
            <Plus className="h-3.5 w-3.5" />
            Create Assessment
          </Button>
        ) : undefined
      }
    >
      {!items?.length ? (
        <EmptyState
          illustration={<ClipboardCheck className="h-8 w-8 text-muted-foreground" />}
          title="No assessments available"
          description="Create skill assessments to evaluate employee competencies."
          action={isAdmin ? { label: "Create Assessment", onClick: handleOpenSheet } : undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a: Assessment) => {
            const questionCount = a.questions?.length ?? 0;
            const completedCount = a.attempts?.length ?? 0;
            const status = deriveStatus(a.attempts ?? []);
            const statusCfg = getStatusConfig(status);
            const latestAttempt = a.attempts?.[a.attempts.length - 1];
            const latestScore = latestAttempt?.score ?? null;

            return (
              <Card
                key={a.id}
                className={cn(
                  "rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4",
                  statusCfg.accent,
                )}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                        <ClipboardCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        {a.skillName && (
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold truncate">
                            {a.skillName}
                          </p>
                        )}
                        <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                          {a.title}
                        </h3>
                      </div>
                    </div>
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", statusCfg.badge)}>
                      {statusCfg.icon}
                      {statusCfg.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    {a.timeLimit && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {a.timeLimit} min
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <ClipboardCheck className="h-2.5 w-2.5" />
                      {questionCount} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-2.5 w-2.5" />
                      {completedCount} attempt{completedCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {latestScore !== null && (
                    <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground">Latest score:</span>
                      <span className={cn(
                        "inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        latestAttempt?.passed
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
                      )}>
                        {latestScore}%
                        {latestAttempt?.passed && <CheckCircle2 className="h-2.5 w-2.5 ml-1" />}
                      </span>
                      {a.passingScore && (
                        <span className="text-[10px] text-muted-foreground/70">
                          Pass: {a.passingScore}%
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Create Assessment"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="e.g., JavaScript Proficiency"
            value={title}
            onChange={handleTitleChange}
            maxLength={200}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Skill / Category</label>
            <Input
              placeholder="e.g., Technical"
              value={skillName}
              onChange={handleSkillNameChange}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Duration (min)</label>
            <Input
              type="number"
              min={1}
              max={480}
              step={1}
              value={duration}
              onChange={handleDurationChange}
            />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
