"use client";

import { use, useState, useCallback } from "react";
import { useModules, useCreateModule, useProjectMembers } from "@/hooks/api/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
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
import { Plus, Calendar, Package, Activity, CheckCircle2 } from "lucide-react";
import { useForm, Controller, useController } from "react-hook-form";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/features/projects/shared/resolve-user-name";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const MODULE_STATUSES = ["backlog", "planned", "in-progress", "paused", "completed", "cancelled"] as const;

const createModuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(MODULE_STATUSES).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  leadId: z.string().optional(),
});
type CreateModuleForm = z.infer<typeof createModuleSchema>;

export default function ModulesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: modules, isLoading } = useModules(projectId);
  const { data: members } = useProjectMembers(projectId);

  const createMutation = useCreateModule();

  const form = useForm<CreateModuleForm>({
    resolver: zodResolver(createModuleSchema),
    defaultValues: { status: "backlog" },
  });

  const handleSetStartDate = useCallback(
    (v: string) => form.setValue("startDate", v),
    [form]
  );
  const handleSetEndDate = useCallback(
    (v: string) => form.setValue("endDate", v),
    [form]
  );
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);

  const { field: leadIdField } = useController({ control: form.control, name: "leadId" });
  const handleLeadChange = useCallback(
    (v: string) => leadIdField.onChange(v || undefined),
    [leadIdField]
  );

  const onSubmit = useCallback((data: CreateModuleForm) => {
    createMutation.mutate(
      { ...data, projectId },
      {
        onSuccess: () => {
          setCreateOpen(false);
          form.reset();
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
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
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
                  <Label htmlFor="mod-desc">Description</Label>
                  <Textarea id="mod-desc" {...form.register("description")} />
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
                              {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
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
                    <DatePicker id="mod-start" value={form.watch("startDate") || ""} onChange={handleSetStartDate} placeholder="Start date" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mod-end">End Date</Label>
                    <DatePicker id="mod-end" value={form.watch("endDate") || ""} onChange={handleSetEndDate} placeholder="End date" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Lead</Label>
                  <Select
                    value={leadIdField.value?.toString() ?? ""}
                    onValueChange={handleLeadChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead..." />
                    </SelectTrigger>
                    <SelectContent>
                      {members?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {getUserDisplayName(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </form>
            </div>
            <div className="shrink-0 px-6 py-4 border-t">
              <Button type="submit" form="module-form" disabled={createMutation.isPending} className="w-full">
                {createMutation.isPending ? "Creating..." : "Create Module"}
              </Button>
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
