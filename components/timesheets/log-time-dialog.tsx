"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { Plus, Loader2 } from "lucide-react";
import { addTimeEntryInputSchema } from "@/lib/validations/project";

export function LogTimeDialog() {
  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: projects } = api.project.getProjects.useQuery();
  const { data: projectDetails, isLoading: isLoadingTickets } = api.project.getProjectDetails.useQuery(
    { id: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  
  const utils = api.useUtils();
  const mutation = api.project.addTimeEntry.useMutation({
      onSuccess: () => {
          toast.success("Time logged successfully");
          setOpen(false);
          form.reset();
          setSelectedProjectId(null);
          utils.project.getTimeEntries.invalidate();
      },
      onError: (err) => {
          toast.error(err.message || "Failed to log time");
      }
  });

  const form = useForm<z.infer<typeof addTimeEntryInputSchema>>({
    resolver: zodResolver(addTimeEntryInputSchema),
    defaultValues: {
      hours: 0,
      description: "",
      date: new Date(),
    },
  });

  function onSubmit(values: z.infer<typeof addTimeEntryInputSchema>) {
    mutation.mutate(values);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Log Time
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
          <DialogDescription>
            Record your work hours on a ticket.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <div className="space-y-2">
                <FormLabel>Project</FormLabel>
                <Select
                    onValueChange={(val) => {
                        setSelectedProjectId(parseInt(val));
                        // Reset ticket selection if project changes
                        form.setValue("ticketId", -1); // Reset to invalid or clear
                    }}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Project" />
                    </SelectTrigger>
                    <SelectContent>
                        {projects?.map((p: any) => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name} ({p.key})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <FormField
              control={form.control}
              name="ticketId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ticket</FormLabel>
                  <Select
                    disabled={!selectedProjectId}
                    onValueChange={(val) => field.onChange(parseInt(val))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingTickets ? "Loading..." : "Select Ticket"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectDetails?.tickets?.map((t: any) => (
                        <SelectItem key={t.id} value={t.id.toString()}>
                           {t.key}: {t.name}
                        </SelectItem>
                      ))}
                      {projectDetails?.tickets?.length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground">No tickets found</div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                        <Input 
                            type="date" 
                            value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                            onChange={(e) => field.onChange(e.target.valueAsDate)}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                        <Input 
                            type="number" 
                            step="0.5" 
                            placeholder="8" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}    
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What did you work on?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Log Time
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
