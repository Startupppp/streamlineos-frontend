"use client";

import type { UseFormReturn } from "react-hook-form";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { clampNoticeFor, describeWaitHours } from "./nurture-cadence";
import type { NurtureStepsFormValues } from "./nurture-steps-schema";

const CLAMPED_TONE = statusToneClasses("warning");

interface NurtureStepRowProps {
  form: UseFormReturn<NurtureStepsFormValues>;
  index: number;
  /** Hours from enrolment to this step, over the waits the sender will keep. */
  offsetHours: number;
  canManage: boolean;
  onRemove: (index: number) => void;
}

/**
 * One wait, and what it will actually become.
 *
 * The typed value and the run value are shown together rather than the field
 * silently correcting itself, because the correction is upward: somebody
 * authoring a two-day cadence is describing something the guardrails will
 * refuse at send time, and a field that quietly rewrote 48 to 240 would leave
 * them believing the sequence they configured is the sequence that runs.
 */
export function NurtureStepRow({
  form,
  index,
  offsetHours,
  canManage,
  onRemove,
}: NurtureStepRowProps) {
  const handleRemove = () => onRemove(index);

  return (
    <FormField
      control={form.control}
      name={`steps.${index}.waitHours`}
      render={({ field }) => {
        const typed = Number(field.value);
        const notice = clampNoticeFor(typed);

        return (
          <FormItem className="flex flex-row flex-wrap items-start gap-gap-field rounded-md border border-border bg-card p-3">
            <span className="w-14 shrink-0 pt-2 text-micro font-medium tracking-wider text-muted-foreground">
              STEP {index + 1}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <FormLabel>
                {index === 0 ? "Wait after enrolling" : "Wait after the previous step"}
              </FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    {...field}
                    inputMode="numeric"
                    autoComplete="off"
                    disabled={!canManage}
                    className="w-28"
                    aria-label={`Step ${index + 1} wait in hours`}
                  />
                </FormControl>
                <span className="text-label text-muted-foreground">hours</span>
              </div>

              <FormDescription>
                Due {describeWaitHours(offsetHours)} after enrolling.
              </FormDescription>
              {notice ? (
                <p className={cn("text-micro", CLAMPED_TONE.ink)}>{notice}</p>
              ) : null}
              <FormMessage />
            </div>

            {canManage ? (
              <AnimatedIconButton
                icon={Trash2Icon}
                type="button"
                variant="ghost"
                size="icon"
                className="mt-6 w-7 shrink-0"
                aria-label={`Remove step ${index + 1}`}
                onClick={handleRemove}
              />
            ) : null}
          </FormItem>
        );
      }}
    />
  );
}
