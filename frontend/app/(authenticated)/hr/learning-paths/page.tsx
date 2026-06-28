"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { HrSheet } from "@/features/hr/hr-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Plus, GraduationCap, Clock, Target, BookOpen, AlertCircle } from "lucide-react";
import { useAbility } from "@/lib/abilities-context";
import { cn } from "@/lib/utils";

interface LearningPath {
  id: number;
  title: string;
  description: string | null;
  level: string | null;
  estimatedHours: number | null;
  targetRole: string | null;
  createdAt: string | null;
}

const lpKeys = {
  all: [...queryKeys.hr.all, "learning-paths"] as const,
  list: () => [...lpKeys.all, "list"] as const,
};

const LEVEL_CONFIG: Record<string, { badge: string; bar: string }> = {
  Beginner: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    bar: "bg-emerald-500",
  },
  Intermediate: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    bar: "bg-amber-500",
  },
  Advanced: {
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    bar: "bg-rose-500",
  },
};

const LEVEL_PROGRESS: Record<string, number> = {
  Beginner: 33,
  Intermediate: 66,
  Advanced: 100,
};

export default function LearningPathsPage() {
  const qc = useQueryClient();
  const ability = useAbility();
  const isAdmin = ability.can("manage", "hr:performance");

  const { data: paths, isLoading, isError, refetch } = useQuery({
    queryKey: lpKeys.list(),
    queryFn: () => apiClient.get<LearningPath[]>("/hr/learning-paths"),
  });

  const create = useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      level?: string;
      estimatedHours?: number;
    }) => apiClient.post<LearningPath>("/hr/learning-paths", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: lpKeys.list() }),
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [hours, setHours] = useState("");

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setLevel("");
    setHours("");
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm();
    setSheetOpen(open);
  }, [resetForm]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value), []);
  const handleHoursChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setHours(e.target.value), []);

  const handleCreate = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) { toast.error("Title is required"); return; }
    if (trimmedTitle.length < 2) { toast.error("Title must be at least 2 characters"); return; }
    if (trimmedTitle.length > 200) { toast.error("Title must be at most 200 characters"); return; }
    const numHours = Number(hours);
    if (hours && (!Number.isInteger(numHours) || numHours < 1)) {
      toast.error("Estimated hours must be a positive whole number");
      return;
    }
    create.mutate(
      {
        title: trimmedTitle,
        description: description.trim() || undefined,
        level: level || undefined,
        estimatedHours: numHours || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Learning path created");
          setSheetOpen(false);
          resetForm();
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [title, description, level, hours, create, resetForm]);

  if (isLoading) {
    return (
      <PageWrapper title="Learning Paths" subtitle="Structured learning programs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Learning Paths" subtitle="Structured learning programs">
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="text-sm font-medium text-foreground">Failed to load learning paths</p>
            <p className="text-xs text-muted-foreground mt-0.5">Something went wrong. Please try again.</p>
          </div>
          <Button size="sm" variant="outline" onClick={refetch}>Try again</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Learning Paths"
      subtitle="Structured learning programs and career development"
      badge={`${paths?.length ?? 0} paths`}
      actions={
        isAdmin ? (
          <Button size="sm" className="gap-1.5" onClick={handleOpenSheet}>
            <Plus className="h-3.5 w-3.5" />
            Create Path
          </Button>
        ) : undefined
      }
    >
      {!paths?.length ? (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <EmptyState
            illustration={<GraduationCap className="h-8 w-8 text-muted-foreground" />}
            title="No learning paths available"
            description="Create structured learning programs to support career development."
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((lp: LearningPath) => {
            const levelCfg = lp.level ? LEVEL_CONFIG[lp.level] : null;
            const progressVal = lp.level ? (LEVEL_PROGRESS[lp.level] ?? 50) : 50;

            return (
              <Card
                key={lp.id}
                className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 border-l-4 border-l-emerald-500"
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
                        {lp.title}
                      </h3>
                    </div>
                    {lp.level && levelCfg && (
                      <span className={cn("inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0", levelCfg.badge)}>
                        {lp.level}
                      </span>
                    )}
                  </div>

                  {lp.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{lp.description}</p>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span className="font-semibold uppercase tracking-wider">Complexity</span>
                      <span>{lp.level ?? "General"}</span>
                    </div>
                    <Progress
                      value={progressVal}
                      className={cn("h-1.5 bg-muted [&>div]:bg-emerald-500")}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                    {lp.estimatedHours && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {lp.estimatedHours}h
                      </span>
                    )}
                    {lp.targetRole && (
                      <span className="flex items-center gap-1">
                        <Target className="h-2.5 w-2.5" />
                        {lp.targetRole}
                      </span>
                    )}
                    {!lp.estimatedHours && !lp.targetRole && (
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-2.5 w-2.5" />
                        Self-paced
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Create Learning Path"
        onSubmit={handleCreate}
        submitLabel="Create"
        isPending={create.isPending}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="e.g., Frontend Engineering Track"
            value={title}
            onChange={handleTitleChange}
            maxLength={200}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Description</label>
          <Textarea
            placeholder="Path overview..."
            value={description}
            onChange={handleDescriptionChange}
            rows={3}
            maxLength={1000}
            className="resize-none w-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Level</label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger>
                <SelectValue placeholder="Select level" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Est. Hours</label>
            <Input
              type="number"
              min={1}
              step={1}
              placeholder="40"
              value={hours}
              onChange={handleHoursChange}
            />
          </div>
        </div>
      </HrSheet>
    </PageWrapper>
  );
}
