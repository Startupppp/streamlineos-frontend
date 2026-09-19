"use client";

import { useState, useCallback } from "react";
import { useCycles, useCreateCycle } from "@/hooks/api/build";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { formatShortDate } from "@/lib/date-utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetBody } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import { Calendar, CheckCircle2, Clock, ArrowRight, AlertTriangle } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PlusIcon, ChevronDownIcon, ChevronRightIcon } from "@animateicons/react/lucide";
import { useRegisterBuildDirtyState } from "@/features/build/navigation/build-dirty-state-context";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { refineDateOrder, refineNotBeforeToday } from "@/lib/date-refinements";
import type { Cycle } from "@/types/projects";
import { useCan } from "@/hooks/api/access";

const DESCRIPTION_MAX = 500;

const createCycleSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name is required")
      .transform((v) => v.trim())
      .pipe(
        z
          .string()
          .min(2, "Name must be at least 2 characters")
          .max(100, "Name must be 100 characters or fewer")
          .regex(/[A-Za-z0-9]/, "Name must contain at least one letter or number")
      ),
    description: z
      .string()
      .max(DESCRIPTION_MAX, `Description must be ${DESCRIPTION_MAX} characters or fewer`)
      .optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .superRefine((data, ctx) => {
    refineNotBeforeToday(data.startDate, ctx, "startDate", "Start date cannot be in the past");
    refineNotBeforeToday(data.endDate, ctx, "endDate", "End date cannot be in the past");
    refineDateOrder(data, ctx, {
      mode: "after",
      message: "End date must be after start date",
    });
  });

type CreateCycleForm = z.infer<typeof createCycleSchema>;

const FORM_DEFAULTS: CreateCycleForm = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
};

function hasDuplicateName(cycles: Cycle[] | undefined, name: string): boolean {
  if (!cycles || !name.trim()) return false;
  const trimmed = name.trim().toLowerCase();
  return cycles.some((c) => c.name.trim().toLowerCase() === trimmed);
}

interface CyclesPageProps {
  projectId: number;
}

export function CyclesPage({ projectId }: CyclesPageProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const canManage = useCan("build:workspace:manage");

  const { data: cycles, isLoading, isError, refetch } = useCycles(projectId);
  const activeCycles = cycles?.filter((c) => c.status === "active") ?? [];
  const upcomingCycles = cycles?.filter((c) => c.status === "draft") ?? [];
  const completedCycles = cycles?.filter((c) => c.status === "completed") ?? [];
  const [showCompleted, setShowCompleted] = useState(false);

  const createMutation = useCreateCycle();

  const form = useForm<CreateCycleForm>({
    resolver: zodResolver(createCycleSchema),
    defaultValues: FORM_DEFAULTS,
  });
  useRegisterBuildDirtyState(createOpen && form.formState.isDirty);

  const watchedName = form.watch("name");
  const watchedDescription = form.watch("description") ?? "";
  const showDuplicateWarning = hasDuplicateName(cycles, watchedName);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        form.reset(FORM_DEFAULTS);
      }
      setCreateOpen(open);
    },
    [form],
  );

  const handleToggleCompleted = useCallback(() => setShowCompleted((v) => !v), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const { iconRef: completedChevronRef, hoverHandlers: completedChevronHoverHandlers } = useAnimatedIcon();
  const watchedStartDate = form.watch("startDate");
  const startPickerBounds = planningStartPickerProps();
  const endPickerBounds = planningEndPickerProps({
    startDate: watchedStartDate,
    mode: "after",
  });

  const handleSetStartDate = useCallback(
    (v: string) => {
      form.setValue("startDate", v, { shouldValidate: true });
      const currentEnd = form.getValues("endDate") ?? "";
      const nextEnd = clearEndIfInvalid(v, currentEnd, "after");
      if (nextEnd !== currentEnd) {
        form.setValue("endDate", nextEnd, { shouldValidate: true });
      }
    },
    [form],
  );
  const handleSetEndDate = useCallback(
    (v: string) => {
      form.setValue("endDate", v, { shouldValidate: true });
    },
    [form],
  );

  const onSubmit = useCallback(
    (data: CreateCycleForm) => {
      createMutation.mutate(
        { ...data, projectId },
        {
          onSuccess: () => {
            form.reset(FORM_DEFAULTS);
            setCreateOpen(false);
            toast.success("Cycle created");
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    },
    [createMutation, projectId, form],
  );

  if (isLoading) {
    return (
      <PageWrapper title="Cycles">
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <div className="bg-card border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-14 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <div className="border-t border-border" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-44" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-14 rounded-full" />
                  <Skeleton className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Cycles">
        <ErrorState
          className="flex-1"
          title="Couldn't load cycles"
          description="Failed to load cycles for this project. Please try again."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  const hasCycles = activeCycles.length > 0 || upcomingCycles.length > 0 || completedCycles.length > 0;

  return (
    <PageWrapper
      title="Cycles"
      subtitle="Time-box work into focused iterations"
      actions={
        canManage ? <Sheet open={createOpen} onOpenChange={handleOpenChange}>
          <SheetTrigger asChild>
            <AnimatedIconButton size="sm" icon={PlusIcon} iconSize={16} iconClassName="mr-1">
              New Cycle
            </AnimatedIconButton>
          </SheetTrigger>
          <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>Create Cycle</SheetTitle>
            </SheetHeader>
            <SheetBody className="px-6 py-5">
              <form id="cycle-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="e.g. Sprint 1, Q3 Planning..." {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                  )}
                  {!form.formState.errors.name && showDuplicateWarning && (
                    <p className="text-xs text-status-warning-ink flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      A cycle with this name already exists in this project.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="description">Description</Label>
                    <span className={cn("text-xs tabular-nums", watchedDescription.length > DESCRIPTION_MAX ? "text-destructive" : "text-muted-foreground")}>
                      {watchedDescription.length}/{DESCRIPTION_MAX}
                    </span>
                  </div>
                  <Textarea id="description" placeholder="Optional description..." {...form.register("description")} rows={3} />
                  {form.formState.errors.description && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.description.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">Start Date</Label>
                    <DatePicker
                      id="startDate"
                      value={watchedStartDate || ""}
                      onChange={handleSetStartDate}
                      placeholder="Start date"
                      fromDate={startPickerBounds.fromDate}
                      fromYear={startPickerBounds.fromYear}
                      toYear={startPickerBounds.toYear}
                    />
                    {form.formState.errors.startDate && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.startDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate">End Date</Label>
                    <DatePicker
                      id="endDate"
                      value={form.watch("endDate") || ""}
                      onChange={handleSetEndDate}
                      placeholder="End date"
                      fromDate={endPickerBounds.fromDate}
                      fromYear={endPickerBounds.fromYear}
                      toYear={endPickerBounds.toYear}
                    />
                    {form.formState.errors.endDate && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.endDate.message}</p>
                    )}
                  </div>
                </div>
              </form>
            </SheetBody>
            <div className="shrink-0 px-6 py-4 border-t">
              <LoadingButton type="submit" form="cycle-form" isPending={createMutation.isPending} loadingText="Creating..." className="w-full">
                Create Cycle
              </LoadingButton>
            </div>
          </SheetContent>
        </Sheet> : undefined
      }
    >
      {hasCycles && (
        <div className="flex flex-1 min-h-0 flex-col gap-6">
          {activeCycles.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active</p>
              <div className="grid gap-3">
                {activeCycles.map((cycle) => (
                  <Link key={cycle.id} href={`/build/${projectId}/cycles/${cycle.id}`}>
                    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="min-w-0 font-semibold text-sm truncate" title={cycle.name}>{cycle.name}</span>
                        <Badge className="shrink-0 bg-status-success-surface text-status-success-ink">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatShortDate(cycle.startDate)} — {formatShortDate(cycle.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {cycle.completedItems}/{cycle.totalItems} done
                        </span>
                      </div>
                      <div className="mt-3">
                        <div
                          className="w-full bg-muted rounded-full h-1.5"
                          role="progressbar"
                          aria-valuenow={cycle.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Cycle progress: ${cycle.progress}%`}
                        >
                          <div
                            className="bg-status-success-fill h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${cycle.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 block">{cycle.progress}% complete</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {activeCycles.length > 0 && upcomingCycles.length > 0 && (
            <div className="border-t border-border" />
          )}

          {upcomingCycles.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Upcoming</p>
              <div className="grid gap-3">
                {upcomingCycles.map((cycle) => (
                  <Link key={cycle.id} href={`/build/${projectId}/cycles/${cycle.id}`}>
                    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" title={cycle.name}>{cycle.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatShortDate(cycle.startDate)} — {formatShortDate(cycle.endDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary">
                          Draft
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {completedCycles.length > 0 && (
            <>
              {(activeCycles.length > 0 || upcomingCycles.length > 0) && (
                <div className="border-t border-border" />
              )}
              <section>
                <button
                  onClick={handleToggleCompleted}
                  className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 hover:text-foreground transition-colors"
                  {...completedChevronHoverHandlers}
                >
                  {showCompleted ? (
                    <ChevronDownIcon ref={completedChevronRef} size={12} />
                  ) : (
                    <ChevronRightIcon ref={completedChevronRef} size={12} />
                  )}
                  Completed ({completedCycles.length})
                </button>
                {showCompleted && (
                  <div className="grid gap-3">
                    {completedCycles.map((cycle) => (
                      <Link key={cycle.id} href={`/build/${projectId}/cycles/${cycle.id}`}>
                        <div className={cn(
                          "bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between gap-3",
                          "opacity-70 hover:opacity-100"
                        )}>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate" title={cycle.name}>{cycle.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {cycle.completedItems}/{cycle.totalItems} items completed
                            </p>
                          </div>
                          <Badge variant="secondary" className="shrink-0">
                            Completed
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {!hasCycles && (
        <EmptyState
          illustration={<EmptyCalendarIllustration />}
          title="No cycles yet"
          description="Create your first cycle to start planning work in time-boxed iterations."
          action={canManage ? { label: "Create First Cycle", onClick: handleOpenCreate } : undefined}
        />
      )}
    </PageWrapper>
  );
}
