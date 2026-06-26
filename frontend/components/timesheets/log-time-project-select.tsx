"use client";

import {
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
import type { UseFormReturn } from "react-hook-form";
import type * as z from "zod";
import type { addTimeEntryInputSchema } from "@/lib/validation/projects";
import type { ProjectListItem, Ticket } from "@/types/projects";

interface LogTimeProjectSelectProps {
  form: UseFormReturn<z.infer<typeof addTimeEntryInputSchema>>;
  projects: ProjectListItem[];
  tickets: Ticket[];
  isLoadingTickets: boolean;
  onProjectChange: (projectId: number) => void;
}

export function LogTimeProjectSelect({
  form,
  projects,
  tickets,
  isLoadingTickets,
  onProjectChange,
}: LogTimeProjectSelectProps) {
  const handleProjectValueChange = (val: string) => {
    onProjectChange(parseInt(val));
    form.setValue("ticketId", undefined as unknown as number);
  };

  const handleTicketValueChange = (
    val: string,
    onChange: (value: number) => void,
  ) => {
    onChange(parseInt(val));
  };

  return (
    <>
      <FormField
        control={form.control}
        name="ticketId"
        render={() => (
          <FormItem>
            <FormLabel>Project</FormLabel>
            <Select onValueChange={handleProjectValueChange}>
              <FormControl>
                <SelectTrigger className="w-full capitalize">
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {projects.map((p: ProjectListItem) => (
                  <SelectItem
                    key={p.id}
                    value={p.id.toString()}
                    className="truncate capitalize"
                  >
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
              disabled={tickets.length === 0 && !isLoadingTickets || isLoadingTickets}
              onValueChange={(val) => handleTicketValueChange(val, field.onChange)}
              value={field.value?.toString()}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      isLoadingTickets ? "Loading tickets..." : "Select Ticket"
                    }
                    className="truncate"
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-w-[500px] w-(--radix-select-trigger-width)">
                {tickets.length > 0 ? (
                  tickets.map((t: Ticket) => (
                    <SelectItem
                      key={t.id}
                      value={t.id.toString()}
                      className="truncate capitalize"
                    >
                      {`Ticket #${t.id}`}: {t.title || "Untitled"}
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
    </>
  );
}
