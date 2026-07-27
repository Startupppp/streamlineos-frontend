"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { useProjects } from "@/hooks/api/build/projects";
import { useCreateTaskFromMessage } from "@/hooks/api/chat";
import { getErrorMessage } from "@/lib/get-error-message";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  projectId: z.string().min(1, "Select a project"),
  type: z.enum(["TASK", "BUG"]),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
  messageId: number;
  defaultTitle: string;
}

export function ConvertToTaskDialog({
  open,
  onOpenChange,
  channelId,
  messageId,
  defaultTitle,
}: Props) {
  const { data: projectsData, isLoading: loadingProjects } = useProjects(
    undefined,
    { enabled: open },
  );
  const createTask = useCreateTaskFromMessage();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultTitle,
      projectId: "",
      type: "TASK",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ title: defaultTitle, projectId: "", type: "TASK" });
    }
  }, [open, defaultTitle, form]);

  async function handleSubmit(values: FormValues) {
    try {
      await createTask.mutateAsync({
        channelId,
        messageId,
        projectId: Number(values.projectId),
        type: values.type,
        title: values.title.trim() || undefined,
      });
      toast.success(`Created ${values.type}`);
      onOpenChange(false);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Title <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Task title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Project <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loadingProjects}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={loadingProjects ? "Loading…" : "Select project"}
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectsData?.data.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.key} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TASK">Task</SelectItem>
                      <SelectItem value="BUG">Bug</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={createTask.isPending} loadingText="Creating…">
                Create
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
