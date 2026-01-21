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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Plus, Loader2, Link as LinkIcon } from "lucide-react";
import { addTimeEntryInputSchema } from "@/lib/validations/project";
import type { Project, Ticket } from "@/types/api";

interface LogTimeDialogProps {
  variant?: "dialog" | "sheet";
  trigger?: React.ReactNode;
}

export function LogTimeDialog({ variant = "dialog", trigger }: LogTimeDialogProps) {
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
      workLink: "",
    },
  });

  function onSubmit(values: z.infer<typeof addTimeEntryInputSchema>) {
    const submitValues = {
      ...values,
      workLink: (values.workLink || "").trim() || undefined,
    };
    mutation.mutate(submitValues);
  }

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        <FormField
          control={form.control}
          name="ticketId"
          render={() => (
            <FormItem>
              <FormLabel>Project</FormLabel>
              <Select
                onValueChange={(val) => {
                    setSelectedProjectId(parseInt(val));
                    form.setValue("ticketId", -1);
                }}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                    {projects?.map((p: Project) => (
                        <SelectItem key={p.id} value={p.id.toString()} className="truncate">
                            {p.name} ({p.key})
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
          name="ticketId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ticket</FormLabel>
              <Select
                disabled={!selectedProjectId || isLoadingTickets}
                onValueChange={(val) => field.onChange(parseInt(val))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isLoadingTickets ? "Loading tickets..." : "Select Ticket"} className="truncate" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-w-[500px] w-[var(--radix-select-trigger-width)]">
                  {projectDetails?.tickets && projectDetails.tickets.length > 0 ? (
                    projectDetails.tickets.map((t: Ticket) => (
                      <SelectItem key={t.id} value={t.id.toString()} className="truncate">
                        {`Ticket #${t.id}`}: {t.title || 'Untitled'}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      {isLoadingTickets ? "Loading..." : "No tickets found"}
                    </div>
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
                        value={field.value || ""}
                        onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? 0 : parseFloat(value));
                        }}
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
                <Textarea 
                  placeholder="What did you work on?" 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workLink"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Link</FormLabel>
              <FormControl>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="url"
                    placeholder="https://example.com/work-done"
                    className="pl-9"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {variant === "sheet" ? (
          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Time
            </Button>
          </div>
        ) : (
          <DialogFooter className="pt-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log Time
            </Button>
          </DialogFooter>
        )}
      </form>
    </Form>
  );

  if (variant === "sheet") {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Log Time
            </Button>
          )}
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-[540px] overflow-y-auto">
          <SheetHeader className="pb-6 pt-6 px-6">
            <SheetTitle>Log Time</SheetTitle>
            <SheetDescription className="mt-2">
              Record your work hours on a ticket.
            </SheetDescription>
          </SheetHeader>
          <div className="px-6 pb-6">
            {formContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Log Time
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="pb-4">
          <DialogTitle>Log Time</DialogTitle>
          <DialogDescription>
            Record your work hours on a ticket.
          </DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
