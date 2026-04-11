"use client";

import { use, useState, useMemo, useCallback } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useProject,
  useUpdateProject,
  useDeleteProject,
} from "@/lib/api/hooks/projects";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateProjectSettingsInputSchema } from "@/lib/validations/project";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Check,
  ChevronsUpDown,
  User,
  AlertTriangle,
  Settings,
  Users,
  Trash2,
} from "lucide-react";
import { useHrEmployees } from "@/lib/api/hooks/hr";
import { useSession } from "next-auth/react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

const formSchema = updateProjectSettingsInputSchema.omit({ projectId: true });
type FormValues = z.infer<typeof formSchema>;

export default function ProjectSettingsPage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr);
  const router = useRouter();
  const { data: session } = useSession();

  const { data: project, isLoading } = useProject(projectId);
  const deleteMutation = useDeleteProject();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "ACTIVE",
    },
    values: project
      ? {
          name: project.name || "",
          description: project.description || "",
          status:
            (project.status as "ACTIVE" | "COMPLETED" | "ARCHIVED") ||
            "ACTIVE",
          memberIds:
            project.members?.map((m: { userId: string }) => m.userId) || [],
        }
      : undefined,
  });

  const updateMutation = useUpdateProject();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = useCallback(() => {
    deleteMutation.mutate(
      { projectId },
      {
        onSuccess: () => {
          toast.success("Project deleted successfully");
          router.push("/projects");
        },
        onError: (error) => {
          toast.error(
            (error as Error).message || "Failed to delete project"
          );
        },
      }
    );
  }, [deleteMutation, projectId, router]);

  if (isLoading) {
    return (
      <PageWrapper title="Settings">
        <div className="max-w-xl mx-auto space-y-6 pb-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (!project) {
    return (
      <PageWrapper title="Settings">
        <div className="flex items-center justify-center h-64" role="alert">
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-destructive">
              Project not found
            </h2>
            <p className="text-sm text-muted-foreground">
              The requested project could not be loaded.
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(
      { projectId, ...values },
      {
        onSuccess: () => {
          toast.success("Project settings updated");
          router.push(`/projects/${projectId}`);
        },
        onError: (error) => {
          toast.error(
            (error as Error).message || "Failed to update project settings"
          );
        },
      }
    );
  };

  const isOwner = session?.user?.role === "CEO";

  return (
    <PageWrapper
      title="Settings"
      subtitle={project.name}
    >
      <div className="max-w-xl mx-auto space-y-6 pb-8">

        <Card>
          <CardContent className="pt-5 space-y-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Settings className="h-4 w-4 text-muted-foreground" />
              General
            </div>
            <Separator />

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter project name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Project description"
                          className="min-h-[80px] resize-none"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Team Members
                  </div>
                  <MembersSelector form={form} />
                </div>

                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="w-full"
                >
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {isOwner && (
          <Card className="border-destructive/30">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </div>
              <Separator />
              <p className="text-sm text-muted-foreground">
                Deleting a project is irreversible. It will remove all
                tickets, sprints, and associated data.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete Project
              </Button>
              <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title="Are you absolutely sure?"
                description={`This action cannot be undone. This will permanently delete "${project.name}" and remove all associated data.`}
                confirmLabel={
                  deleteMutation.isPending ? "Deleting..." : "Delete Project"
                }
                destructive
                onConfirm={handleDeleteConfirm}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </PageWrapper>
  );
}

function MembersSelector({ form }: { form: UseFormReturn<FormValues> }) {
  const { data: employeesData } = useHrEmployees();
  const employees = Array.isArray(employeesData)
    ? employeesData
    : (employeesData?.data ?? []);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmployees = useMemo(
    () =>
      employees?.filter(
        (emp) =>
          emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [employees, searchQuery]
  );

  return (
    <FormField
      control={form.control}
      name="memberIds"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  role="combobox"
                >
                  {field.value?.length && field.value.length > 0
                    ? `${field.value.length} member${field.value.length > 1 ? "s" : ""} selected`
                    : "Select members"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] p-2"
                align="start"
              >
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 mb-2"
                  aria-label="Search team members"
                />
                <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                  {filteredEmployees?.map((emp) => {
                    const selected = field.value?.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-accent text-left"
                        onClick={() => {
                          const current = field.value || [];
                          const next = selected
                            ? current.filter((id: string) => id !== emp.id)
                            : [...current, emp.id];
                          field.onChange(next);
                        }}
                      >
                        <Checkbox
                          checked={selected}
                          tabIndex={-1}
                          className="pointer-events-none"
                          aria-hidden
                        />
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium shrink-0">
                          {emp.name?.charAt(0) || (
                            <User className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {emp.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {emp.email}
                          </p>
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 text-primary shrink-0" />
                        )}
                      </button>
                    );
                  })}
                  {!filteredEmployees?.length && (
                    <p className="text-sm text-center py-4 text-muted-foreground">
                      No employees found
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
