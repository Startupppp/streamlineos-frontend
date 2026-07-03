"use client";

import { use, useState, useCallback } from "react";
import { useCycles, useCreateCycle } from "@/hooks/api/projects";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { EmptyCalendarIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, CheckCircle2, Clock, ArrowRight, ChevronDown, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

const createCycleSchema = z.object({
  name: z.string().min(1, "Name is required").regex(/^[A-Za-z]/, "Name must start with a letter").max(100),
  description: z.string().optional(),
  startDate: z.string().min(1, "Start date required").refine(
    (v) => { const y = new Date(v).getFullYear(); return y >= 2000 && y <= 2099; },
    "Year must be between 2000 and 2099"
  ),
  endDate: z.string().min(1, "End date required").refine(
    (v) => { const y = new Date(v).getFullYear(); return y >= 2000 && y <= 2099; },
    "Year must be between 2000 and 2099"
  ),
});
type CreateCycleForm = z.infer<typeof createCycleSchema>;

export default function CyclesPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: cycles, isLoading } = useCycles(projectId);
  const activeCycles = cycles?.filter((c) => c.status === "active") ?? [];
  const upcomingCycles = cycles?.filter((c) => c.status === "draft") ?? [];
  const completedCycles = cycles?.filter((c) => c.status === "completed") ?? [];
  const [showCompleted, setShowCompleted] = useState(false);

  const createMutation = useCreateCycle();

  const form = useForm<CreateCycleForm>({
    resolver: zodResolver(createCycleSchema),
  });

  const handleToggleCompleted = useCallback(() => setShowCompleted((v) => !v), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleSetStartDate = useCallback((v: string) => form.setValue("startDate", v), [form]);
  const handleSetEndDate = useCallback((v: string) => form.setValue("endDate", v), [form]);

  const onSubmit = useCallback((data: CreateCycleForm) => {
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          setCreateOpen(false);
          toast.success("Cycle created");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createMutation, projectId]);

  const subtitleText =
    [
      activeCycles.length > 0 && `${activeCycles.length} active`,
      upcomingCycles.length > 0 && `${upcomingCycles.length} upcoming`,
      completedCycles.length > 0 && `${completedCycles.length} completed`,
    ]
      .filter((s): s is string => Boolean(s))
      .join(", ") || undefined;

  if (isLoading) {
    return (
      <PageWrapper title="Cycles" backHref={`/projects/${projectIdStr}`}>
        <div className="space-y-6">
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

  const hasCycles = activeCycles.length > 0 || upcomingCycles.length > 0 || completedCycles.length > 0;

  return (
    <PageWrapper
      title="Cycles"
      subtitle={subtitleText}
      backHref={`/projects/${projectIdStr}`}
      actions={
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Cycle
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>Create Cycle</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form id="cycle-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Enter cycle name..." {...form.register("name")} className="capitalize" />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Optional description..." {...form.register("description")} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">Start Date</Label>
                    <DatePicker id="startDate" value={form.watch("startDate") || ""} onChange={handleSetStartDate} placeholder="Start date" />
                    {form.formState.errors.startDate && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.startDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate">End Date</Label>
                    <DatePicker id="endDate" value={form.watch("endDate") || ""} onChange={handleSetEndDate} placeholder="End date" />
                    {form.formState.errors.endDate && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.endDate.message}</p>
                    )}
                  </div>
                </div>
              </form>
            </div>
            <div className="shrink-0 px-6 py-4 border-t">
              <Button type="submit" form="cycle-form" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Cycle"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      }
    >
      {hasCycles && (
        <div className="space-y-6">
          {activeCycles.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Active</p>
              <div className="grid gap-3">
                {activeCycles.map((cycle) => (
                  <Link key={cycle.id} href={`/projects/${projectId}/cycles/${cycle.id}`}>
                    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-sm truncate">{cycle.name}</span>
                        <Badge className="shrink-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
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
                            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
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
                  <Link key={cycle.id} href={`/projects/${projectId}/cycles/${cycle.id}`}>
                    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{cycle.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          {new Date(cycle.startDate).toLocaleDateString()} — {new Date(cycle.endDate).toLocaleDateString()}
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
                >
                  {showCompleted ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  Completed ({completedCycles.length})
                </button>
                {showCompleted && (
                  <div className="grid gap-3">
                    {completedCycles.map((cycle) => (
                      <Link key={cycle.id} href={`/projects/${projectId}/cycles/${cycle.id}`}>
                        <div className={cn(
                          "bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all cursor-pointer flex items-center justify-between gap-3",
                          "opacity-70 hover:opacity-100"
                        )}>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{cycle.name}</p>
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
          action={{ label: "Create First Cycle", onClick: handleOpenCreate }}
          className="min-h-[40vh]"
        />
      )}
    </PageWrapper>
  );
}
