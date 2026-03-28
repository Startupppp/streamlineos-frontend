"use client";

import { use, useState } from "react";
import { trpc } from "@/trpc/client";
import { ProjectSubNav } from "@/components/projects/project-sub-nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyTasksIllustration } from "@/components/illustrations";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Layers, Calendar, User, ArrowRight } from "lucide-react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Link from "next/link";

const MODULE_STATUSES = ["backlog", "planned", "in-progress", "paused", "completed", "cancelled"] as const;

const createModuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(MODULE_STATUSES).default("backlog"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  leadId: z.string().optional(),
});
type CreateModuleForm = z.infer<typeof createModuleSchema>;

const statusColors: Record<string, string> = {
  backlog: "bg-gray-100 text-gray-700",
  planned: "bg-blue-100 text-blue-700",
  "in-progress": "bg-yellow-100 text-yellow-700",
  paused: "bg-orange-100 text-orange-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function ProgressRing({ value, size = 40 }: { value: number; size?: number }) {
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-primary"
      />
    </svg>
  );
}

export default function ModulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const projectId = parseInt(id);
  const [createOpen, setCreateOpen] = useState(false);

  const utils = trpc.useUtils();
  const { data: modules, isLoading } = trpc.project.modulesGetByProject.useQuery({
    projectId,
  });
  const { data: members } = trpc.project.getProjectMembers.useQuery();

  const createMutation = trpc.project.modulesCreate.useMutation({
    onSuccess: () => {
      utils.project.modulesGetByProject.invalidate({ projectId });
      setCreateOpen(false);
      form.reset();
      toast.success("Module created");
    },
    onError: (err) => toast.error(err.message),
  });

  const form = useForm<CreateModuleForm>({
    resolver: zodResolver(createModuleSchema) as unknown as Resolver<CreateModuleForm>,
    defaultValues: { status: "backlog" },
  });

  const onSubmit = (data: CreateModuleForm) => {
    createMutation.mutate({ ...data, projectId });
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 px-6 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background border-b">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-6 sm:px-8 md:px-12 pt-6 sm:pt-8 md:pt-12 pb-4 bg-background border-b">
        <ProjectSubNav projectId={projectId} />
        <div className="flex items-center justify-between mt-4">
          <h1 className="text-2xl font-bold">Modules</h1>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" /> New Module
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-md overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Create Module</SheetTitle>
              </SheetHeader>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4 p-4"
              >
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
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
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
                    <Input
                      id="mod-start"
                      type="date"
                      {...form.register("startDate")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="mod-end">End Date</Label>
                    <Input
                      id="mod-end"
                      type="date"
                      {...form.register("endDate")}
                    />
                  </div>
                </div>
                <div>
                  <Label>Lead</Label>
                  <Controller
                    control={form.control}
                    name="leadId"
                    render={({ field }) => (
                      <Select
                        value={field.value?.toString() ?? ""}
                        onValueChange={(v) =>
                          field.onChange(v ? parseInt(v) : undefined)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select lead..." />
                        </SelectTrigger>
                        <SelectContent>
                          {members?.map((m) => (
                            <SelectItem
                              key={m.id}
                              value={m.id.toString()}
                            >
                              {m.name ?? m.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending ? "Creating..." : "Create Module"}
                </Button>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!modules?.length ? (
          <div className="text-center py-16">
            <EmptyTasksIllustration className="mx-auto mb-4 w-36 h-36" />
            <h3 className="text-lg font-semibold mb-1">No modules yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first module to organize work into feature areas.
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Create First Module
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((mod) => (
              <Link
                key={mod.id}
                href={`/projects/${projectId}/modules/${mod.id}`}
              >
                <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base truncate">
                        {mod.name}
                      </CardTitle>
                      <Badge
                        className={
                          statusColors[mod.status ?? "backlog"] ??
                          statusColors.backlog
                        }
                      >
                        {(mod.status ?? "backlog")
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ProgressRing value={mod.progress ?? 0} />
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {mod.progress ?? 0}% complete
                        </p>
                        {(mod.startDate || mod.endDate) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {mod.startDate
                              ? new Date(mod.startDate).toLocaleDateString()
                              : "TBD"}{" "}
                            —{" "}
                            {mod.endDate
                              ? new Date(mod.endDate).toLocaleDateString()
                              : "TBD"}
                          </p>
                        )}
                        {mod.leadId && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <User className="h-3 w-3" />
                            Lead assigned
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
