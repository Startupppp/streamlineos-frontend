"use client";

import { use, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useProject,
  useUpdateProjectSettings,
  useDeleteProject,
} from "../../../../../lib/hooks/trpc-hooks";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Textarea } from "../../../../../components/ui/textarea";
import { Button } from "../../../../../components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../../../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import { toast } from "sonner";
import { updateProjectSettingsInputSchema } from "../../../../../lib/validations/project";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { vaivammKeys } from "../../../../../lib/hooks/trpc-hooks";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { Checkbox } from "../../../../../components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../../components/ui/popover";
import { Check, ChevronsUpDown, User, AlertTriangle } from "lucide-react";
import { api } from "../../../../../trpc/react";
import { useSession } from "next-auth/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../../../../components/ui/alert-dialog";

interface PageProps {
  params: Promise<{ id: string }>;
}

const formSchema = updateProjectSettingsInputSchema.omit({ projectId: true });
type FormValues = z.infer<typeof formSchema>;

export default function ProjectSettingsPage({ params }: PageProps) {
  const { id } = use(params);
  const projectId = parseInt(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const { data: project, isLoading } = useProject(projectId);

  const deleteMutation = useDeleteProject({
    onSuccess: () => {
      toast.success("Project deleted successfully");
      router.push("/projects");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete project");
    },
  });

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
            (project.status as "ACTIVE" | "COMPLETED" | "ARCHIVED") || "ACTIVE",
          memberIds: project.members?.map((m: { userId: string }) => m.userId) || [],
        }
      : undefined,
  });

  const updateMutation = useUpdateProjectSettings({
    onSuccess: () => {
      toast.success("Project settings updated");
      queryClient.invalidateQueries({
        queryKey: vaivammKeys.project.project(projectId),
      });
      router.push(`/projects/${projectId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project settings");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto p-6">
        <Skeleton className="h-9 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-24 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate({
      projectId,
      ...values,
    });
  };

  const isOwner = session?.user?.role === "OWNER";

  return (
    <div className="space-y-8 max-w-2xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter project name"
                      />
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
                        className="min-h-[100px]"
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

              <div className="space-y-4">
                  <FormLabel>Team Members</FormLabel>
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
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Deleting a project is irreversible. It will remove all tickets,
              sprints, and associated data.
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  Delete Project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    project <strong>{project.name}</strong> and remove all associated data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => deleteMutation.mutate({ projectId })}
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete Project"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


function MembersSelector({ form }: { form: UseFormReturn<FormValues> }) {
    const { data: employees } = api.hr.getEmployees.useQuery();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredEmployees = employees?.filter(emp => 
        emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        emp.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
                        <Button variant="outline" className="w-full justify-between pl-3 text-left font-normal" role="combobox">
                            {field.value?.length && field.value.length > 0 
                                ? `${field.value.length} members selected`
                                : "Select members"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] sm:w-[460px] p-2" align="start">
                        <div className="p-1 mb-2">
                             <Input 
                                placeholder="Search by name or email..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8"
                             />
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            <h4 className="font-medium leading-none mb-2 text-sm text-muted-foreground p-1">Select Employees</h4>
                            {filteredEmployees?.map((emp) => (
                                <div key={emp.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                                        onClick={() => {
                                            const current = field.value || [];
                                            const newData = current.includes(emp.id)
                                                ? current.filter((id: string) => id !== emp.id)
                                                : [...current, emp.id];
                                            field.onChange(newData);
                                        }}
                                >
                                    <Checkbox 
                                        checked={field.value?.includes(emp.id)}
                                        onCheckedChange={(checked) => {
                                            const current = field.value || [];
                                            if (checked) {
                                                field.onChange([...current, emp.id]);
                                            } else {
                                                field.onChange(current.filter((id: string) => id !== emp.id));
                                            }
                                        }}
                                    />
                                    <div className="flex items-center space-x-2 flex-1">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                                            {emp.name?.charAt(0) || <User className="h-3 w-3" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{emp.name}</span>
                                            <span className="text-xs text-muted-foreground">{emp.email}</span>
                                        </div>
                                    </div>
                                    {field.value?.includes(emp.id) && <Check className="h-4 w-4 text-primary" />}
                                </div>
                            ))}
                            {!filteredEmployees?.length && <div className="text-sm text-center py-4 text-muted-foreground">No employees found</div>}
                        </div>
                    </PopoverContent>
                    </Popover>
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
    )
}
