"use client";

import type { MutableRefObject } from "react";
import type { Control } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { CreateTicketAiFieldTrigger } from "@/features/build/ai/create-ticket-ai-menu";
import { AiInlinePreview, type AiInlineSession } from "@/components/ai";
import type { TicketSearchResult } from "@/types/projects";
import type { CreateTicketFormValues } from "./use-create-ticket-form";

interface AiTriggerProps {
  label: string;
  disabledReason?: string;
  disabled?: boolean;
  isPending?: boolean;
  onClick: () => void;
}

interface TicketDialogTitleFieldProps {
  control: Control<CreateTicketFormValues>;
  titleRef: MutableRefObject<HTMLInputElement | null>;
  canUseAI: boolean;
  titleTriggerProps: AiTriggerProps;
  titleInlineSession: AiInlineSession | null;
  duplicates: TicketSearchResult[];
}

export function TicketDialogTitleField({
  control,
  titleRef,
  canUseAI,
  titleTriggerProps,
  titleInlineSession,
  duplicates,
}: TicketDialogTitleFieldProps) {
  return (
    <div className="shrink-0 space-y-2 border-b border-border/60 px-5 pb-3 pt-4">
      <FormField
        control={control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-start gap-1.5">
              <FormControl>
                <input
                  {...field}
                  ref={(el) => {
                    field.ref(el);
                    titleRef.current = el;
                  }}
                  autoFocus
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Issue title"
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-lg font-semibold leading-tight text-foreground outline-none placeholder:text-muted-foreground/50 focus:ring-0"
                />
              </FormControl>
              {canUseAI ? (
                <CreateTicketAiFieldTrigger
                  {...titleTriggerProps}
                  className="mt-0.5"
                />
              ) : null}
            </div>
            <FormMessage className="text-xs" />
            {titleInlineSession ? (
              <AiInlinePreview
                session={titleInlineSession}
                applyLabel="Replace"
                previewMode="title"
                className="mt-2"
              />
            ) : null}
            {duplicates.length > 0 && (
              <div className="mt-1 flex items-start gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="text-dense font-medium text-amber-700 dark:text-amber-300">
                    Similar open{" "}
                    {duplicates.length === 1 ? "ticket" : "tickets"}{" "}
                    already exist — you can still create this one.
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {duplicates.slice(0, 3).map((d) => (
                      <li
                        key={d.id}
                        className="text-dense text-amber-600 dark:text-amber-400"
                      >
                        {d.projectKey}-{d.ticketNumber}: {d.title}{" "}
                        <span className="text-amber-500 dark:text-amber-400">
                          ({d.status})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </FormItem>
        )}
      />
    </div>
  );
}
