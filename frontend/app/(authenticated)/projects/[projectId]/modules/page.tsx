"use client";

import { use, useState, useCallback } from "react";
import { useModules, useCreateModule } from "@/hooks/api/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { LoadingButton } from "@/components/ui/loading-button";
import { ModuleCard, ModuleCardSkeleton } from "@/features/projects/modules/module-card";
import { EmptyTasksIllustration } from "@/components/illustrations";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { Plus, Calendar, Package, Activity, CheckCircle2 } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { getErrorMessage } from "@/lib/get-error-message";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const MODULE_STATUSES = ["backlog", "planned", "in-progress", "paused", "completed", "cancelled"] as const;
const DESC_MAX = 500;

const moduleNameSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(
    z
      .string()
      .min(2, "Module name must be at least 2 characters")
      .max(80, "Module name must be 80 characters or fewer")
      .regex(/[A-Za-z0-9]/, "Module name must contain at least one letter or number"),
  );

const createModuleSchema = z
  .object({
    name: moduleNameSchema,
    description: z.string().max(DESC_MAX, `Description must be ${DESC_MAX} characters or fewer`).optional(),
    status: z.enum(MODULE_STATUSES).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    leadId: z.string().optional(),
    allowPastDates: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End date must be on or after start date.",
          path: ["endDate"],
        });
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (data.startDate && !data.allowPastDates) {
      const start = new Date(data.startDate);
      if (!isNaN(start.getTime()) && start < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Start date is in the past. Check "Allow past dates" to confirm.',
          path: ["startDate"],
        });
      }
    }
  });

type CreateModuleForm = z.infer<typeof createModuleSchema>;

const FORM_DEFAULTS: Partial<CreateModuleForm> = { status: "backlog", allowPastDates: false };

export default function ModulesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: modules, isLoading } = useModules(projectId);
  const createMutation = useCreateModule();

  const form = useForm<CreateModuleForm>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: FORM_DEFAULTS,
  });

  const descValue = form.watch("description") ?? "";
  const startDateValue = form.watch("startDate") ?? "";
  const endDateValue = form.watch("endDate") ?? "";

  const startDateInPast = (() => {
    if (!startDateValue) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDateValue);
    return !isNaN(start.getTime()) && start < today;
  })();

  const handleSetStartDate = useCallback(
    (v: string) => form.setValue("startDate", v, { shouldValidate: true }),
    [form]
  );
  const handleSetEndDate = useCallback(
    (v: string) => form.setValue("endDate", v, { shouldValidate: true }),
    [form]
  );
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        form.reset(FORM_DEFAULTS);
      }
      setCreateOpen(open);
    },
    [form],
  );

  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const handleLeadChange = useCallback(
    (userId: string | null) => form.setValue("leadId", userId ?? undefined),
    [form]
  );

  const handleAllowPastDatesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      form.setValue("allowPastDates", e.target.checked, { shouldValidate: true });
    },
    [form]
  );

  const onSubmit = useCallback((data: CreateModuleForm) => {
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          form.reset(FORM_DEFAULTS);
          setCreateOpen(false);
          toast.success("Module created");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }, [createMutation, form, projectId]);

  const total = modules?.length ?? 0;
  const inProgress = modules?.filter(m => m.status === "in-progress").length ?? 0;
  const completed = modules?.filter(m => m.status === "completed").length ?? 0;
  const planned = modules?.filter(m => m.status === "planned").length ?? 0;

  if (isLoading) {
    return (
      <PageWrapper title="Modules" eyebrow="Project" subtitle="Organize work into feature groups and track module progress">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ModuleCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Modules"
      eyebrow="Project"
      subtitle="Organize work into feature groups and track module progress"
      actions={
        <Sheet open={createOpen} onOpenChange={handleOpenChange}>
          <SheetTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Module
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col gap-0">
            <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
              <SheetTitle>Create Module</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <form id="module-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mod-name">Name</Label>
                  <Input id="mod-name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="mod-desc">Description</Label>
                    <span className={`text-xs ${descValue.length > DESC_MAX ? "text-destructive" : "text-muted-foreground"}`}>
                      {descValue.length}/{DESC_MAX}
                    </span>
                  </div>
                  <Textarea id="mod-desc" rows={3} {...form.register("description")} />
                  {form.formState.errors.description && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.description.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODULE_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="mod-start">Start Date</Label>
                    <DatePicker
                      id="mod-start"
                      value={startDateValue}
                      onChange={handleSetStartDate}
                      placeholder="Start date"
                    />
                    {form.formState.errors.startDate && (
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.startDate.message}
                      </p>
                    )}
                    {startDateInPast && (
                      <label className="flex items-center gap-1.5 mt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5"
                          {...form.register("allowPastDates")}
                          onChange={handleAllowPastDatesChange}
                        />
                        <span className="text-xs text-amber-600">Allow past dates</span>
                      </label>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mod-end">End Date</Label>
                    <DatePicker
                      id="mod-end"
                      value={endDateValue}
                      onChange={handleSetEndDate}
                      placeholder="End date"
                    />
                    {form.formState.errors.endDate && (
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.endDate.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Lead</Label>
                  <Controller
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                      <ProjectMemberSelect
                        projectId={projectId}
                        mode="single"
                        value={field.value}
                        onChange={handleLeadChange}
                        allowUnassigned
                        placeholder="No lead"
                        className="h-9 text-sm"
                      />
                    )}
                  />
                </div>
              </form>
            </div>
            <div className="shrink-0 px-6 py-4 border-t">
              <LoadingButton
                type="submit"
                form="module-form"
                isPending={createMutation.isPending}
                loadingText="Creating…"
                className="w-full"
              >
                Create Module
              </LoadingButton>
            </div>
          </SheetContent>
        </Sheet>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={total} icon={Package} tone="blue" index={0} />
          <StatCard label="In Progress" value={inProgress} icon={Activity} tone="blue" index={1} />
          <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="emerald" index={2} />
          <StatCard label="Planned" value={planned} icon={Calendar} tone="amber" index={3} />
        </div>

        {!modules?.length ? (
          <EmptyState
            illustration={<EmptyTasksIllustration />}
            title="No modules yet"
            description="Create your first module to organize work into feature areas."
            action={{ label: "Create First Module", onClick: handleOpenCreate }}
            className="min-h-[40vh]"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map((mod, index) => (
              <ModuleCard key={mod.id} module={mod} projectId={projectId} index={index} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
