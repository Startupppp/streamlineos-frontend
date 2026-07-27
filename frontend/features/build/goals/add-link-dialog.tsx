"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useProjects, useTickets } from "@/hooks/api/build";
import { useAddGoalLink } from "@/hooks/api/goals";
import { getErrorMessage } from "@/lib/get-error-message";

const addLinkSchema = z.object({
  projectId: z.string().min(1, "Select a project"),
  ticketId: z.string(),
});

type AddLinkFormValues = z.infer<typeof addLinkSchema>;

interface AddLinkDialogProps {
  goalId: number;
  onClose: () => void;
}

export function AddLinkDialog({ goalId, onClose }: AddLinkDialogProps) {
  const { data: projectsData } = useProjects();
  const addLink = useAddGoalLink(goalId);

  const form = useForm<AddLinkFormValues>({
    resolver: zodResolver(addLinkSchema),
    defaultValues: { projectId: "", ticketId: "" },
  });

  const selectedProjectId = form.watch("projectId");
  const numericProjectId = selectedProjectId ? Number(selectedProjectId) : 0;
  const { data: ticketsData } = useTickets(numericProjectId);

  function handleProjectChange(v: string, onChange: (v: string) => void) {
    onChange(v);
    form.setValue("ticketId", "");
  }

  function handleOpenChange(open: boolean) {
    if (!open) onClose();
  }

  function handleSubmit(values: AddLinkFormValues) {
    const payload = values.ticketId
      ? { ticketId: Number(values.ticketId) }
      : { projectId: Number(values.projectId) };
    addLink.mutate(payload, {
      onSuccess: () => {
        toast.success("Work item linked");
        onClose();
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link work item</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project <span className="text-destructive">*</span></FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => handleProjectChange(v, field.onChange)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectsData?.data.map((project) => (
                        <SelectItem key={project.id} value={String(project.id)}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ticketId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket (optional)</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!selectedProjectId}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Link the whole project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ticketsData?.data.map((ticket) => (
                        <SelectItem key={ticket.id} value={String(ticket.id)}>
                          {ticket.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={addLink.isPending} loadingText="Linking…">
                Link
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
