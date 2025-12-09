"use client";

import { use } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProject, useUpdateProjectSettings } from "@/lib/hooks/trpc-hooks";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useQueryClient } from "@tanstack/react-query";
import { vaivammKeys } from "@/lib/hooks/trpc-hooks";
import { Skeleton } from "@/components/ui/skeleton";

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
  
  const { data: project, isLoading } = useProject(projectId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "ACTIVE",
    },
    values: project ? {
      name: project.name || "",
      description: project.description || "",
      status: (project.status as "ACTIVE" | "COMPLETED" | "ARCHIVED") || "ACTIVE",
    } : undefined,
  });

  const updateMutation = useUpdateProjectSettings({
    onSuccess: () => {
      toast.success("Project settings updated");
      queryClient.invalidateQueries({ queryKey: vaivammKeys.project.project(projectId) });
      router.push(`/projects/${projectId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update project settings");
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <Skeleton className="h-9 w-48" />
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
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

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white">Project Settings</h1>
        
        <Card className="bg-white/5 border-white/10">
            <CardHeader>
                <CardTitle className="text-white">General Information</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Project Name</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              className="bg-black/20 border-white/10 text-white" 
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
                          <FormLabel className="text-white">Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              className="bg-black/20 border-white/10 text-white" 
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
                          <FormLabel className="text-white">Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-black/20 border-white/10 text-white">
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

                    <Button type="submit" disabled={updateMutation.isPending} className="w-full bg-gold text-black hover:bg-yellow-500">
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
