"use client";

import { use, useState, useCallback } from "react";
import { useModules, useCreateModule, useProjectMembers } from "@/hooks/api/projects";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
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
import { Plus, Calendar, User, ArrowRight, Package, Activity, CheckCircle2 } from "lucide-react";
import { useForm, Controller, useController } from "react-hook-form";
import { getErrorMessage } from "@/lib/get-error-message";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";

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

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  backlog: "secondary",
  planned: "outline",
  "in-progress": "default",
  paused: "outline",
  completed: "secondary",
  cancelled: "destructive",
};

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

  const onSubmit = (data: CreateModuleForm) => {
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
  };

  const total = modules?.length ?? 0;
  const inProgress = modules?.filter(m => m.status === "in-progress").length ?? 0;
  const completed = modules?.filter(m => m.status === "completed").length ?? 0;
  const planned = modules?.filter(m => m.status === "planned").length ?? 0;

  if (isLoading) {
    return (
      <PageWrapper title="Modules" backHref={`/projects/${projectId}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Modules"
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label htmlFor="mod-name">Name</Label>
                  <Input id="mod-name" {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="mod-desc">Description</Label>
                  <Textarea id="mod-desc" {...form.register("description")} />
                </div>
                <div>
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
                  <div>
                    <Label htmlFor="mod-start">Start Date</Label>
                    <DatePicker id="mod-start" value={form.watch("startDate") || ""} onChange={handleSetStartDate} placeholder="Start date" />
                  </div>
                  <div>
                    <Label htmlFor="mod-end">End Date</Label>
                    <DatePicker id="mod-end" value={form.watch("endDate") || ""} onChange={handleSetEndDate} placeholder="End date" />
                  </div>
                </div>
                <div>
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
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.user?.name ?? m.user?.email ?? m.userId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full">
                  {createMutation.isPending ? "Creating..." : "Create Module"}
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total" value={total} icon={Package} color="blue" index={0} />
          <StatCard label="In Progress" value={inProgress} icon={Activity} color="blue" index={1} />
          <StatCard label="Completed" value={completed} icon={CheckCircle2} color="green" index={2} />
          <StatCard label="Planned" value={planned} icon={Calendar} color="amber" index={3} />
        </div>

        {!modules?.length ? (
          <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[300px] text-center py-16">
            <EmptyTasksIllustration className="mx-auto mb-4 w-36 h-36" />
            <h3 className="text-lg font-semibold mb-1">No modules yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first module to organize work into feature areas.
            </p>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-1" /> Create First Module
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map((mod) => (
              <Link key={mod.id} href={`/projects/${projectId}/modules/${mod.id}`}>
                <Card className="hover:border-primary/20 transition-colors cursor-pointer h-full bg-card border border-border rounded-lg">
                  <CardHeader className="pb-2 px-4 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm font-semibold leading-tight truncate">
                        {mod.name}
                      </CardTitle>
                      <Badge
                        variant={statusVariant[mod.status ?? "backlog"] ?? "secondary"}
                        className="shrink-0"
                      >
                        {(mod.status ?? "backlog")
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{mod.progress ?? 0}% complete</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-300"
                          style={{ width: `${mod.progress ?? 0}%` }}
                        />
                      </div>
                      {(mod.startDate || mod.endDate) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                          <Calendar className="h-3 w-3 shrink-0" />
                          {mod.startDate
                            ? new Date(mod.startDate).toLocaleDateString()
                            : "TBD"}
                          {" — "}
                          {mod.endDate
                            ? new Date(mod.endDate).toLocaleDateString()
                            : "TBD"}
                        </p>
                      )}
                      {mod.leadId && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <User className="h-3 w-3 shrink-0" />
                          Lead assigned
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
