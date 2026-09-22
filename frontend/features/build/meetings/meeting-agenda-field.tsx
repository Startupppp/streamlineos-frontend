"use client";

import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SparklesIcon, ChevronDownIcon } from "@animateicons/react/lucide";
import type { MeetingFormValues } from "./meeting-form-schema";
import type { AgendaSource } from "./generate-agenda";

interface MeetingAgendaFieldProps {
  onGenerateAgenda?: (sources: AgendaSource[]) => string;
  hasActiveCycle?: boolean;
}

function generateAgendaFrom(
  onChange: (agenda: string) => void,
  generate: (sources: AgendaSource[]) => string,
  sources: AgendaSource[],
): () => void {
  return function handleGenerateAgenda() {
    onChange(generate(sources));
  };
}

function everyAgendaSource(hasActiveCycle: boolean): AgendaSource[] {
  const cycle: AgendaSource[] = hasActiveCycle ? ["cycle"] : [];
  return [...cycle, "overdue", "blocked", "open_action_items"];
}

export function MeetingAgendaField({ onGenerateAgenda, hasActiveCycle }: MeetingAgendaFieldProps) {
  const { control } = useFormContext<MeetingFormValues>();

  return (
    <FormField
      control={control}
      name="agenda"
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center justify-between">
            <FormLabel>Agenda (optional)</FormLabel>
            {onGenerateAgenda && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-dense gap-1 text-primary hover:text-primary/80 px-2"
                  >
                    <SparklesIcon className="h-3 w-3" />
                    Generate
                    <ChevronDownIcon className="h-2.5 w-2.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 text-xs">
                  {hasActiveCycle && (
                    <DropdownMenuItem
                      onClick={generateAgendaFrom(field.onChange, onGenerateAgenda, ["cycle"])}
                    >
                      From current cycle tickets
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={generateAgendaFrom(field.onChange, onGenerateAgenda, ["overdue"])}
                  >
                    Overdue tickets
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={generateAgendaFrom(field.onChange, onGenerateAgenda, ["blocked"])}
                  >
                    Blocked tickets
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={generateAgendaFrom(field.onChange, onGenerateAgenda, ["recently_completed"])}
                  >
                    Recently completed
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={generateAgendaFrom(
                      field.onChange,
                      onGenerateAgenda,
                      everyAgendaSource(hasActiveCycle ?? false),
                    )}
                  >
                    All sources
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <FormControl>
            <Textarea {...field} rows={4} placeholder="Meeting agenda…" className="text-sm resize-none" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
