"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  clearEndIfInvalid,
  planningEndPickerProps,
  planningStartPickerProps,
} from "@/lib/date-constraints";
import { generateProjectKey } from "../generate-project-key";
import {
  basicsSchema,
  PROJECT_NAME_MAX,
  PROJECT_KEY_MAX,
  PROJECT_DESCRIPTION_MAX,
} from "../project-create-schema";
import type { BasicsValues } from "../project-create-schema";
import type { StepSharedProps } from "../use-project-create";
import {
  BasicsManagerField,
  BasicsClientField,
  charCounter,
} from "./step-basics-manager-field";

export type BasicsHandle = { validate: () => Promise<boolean> };

export const StepBasics = forwardRef<BasicsHandle, StepSharedProps>(
  function StepBasicsRender({ draft, updateDraft }, ref) {
    const form = useForm<BasicsValues>({
      resolver: zodResolver(basicsSchema),
      defaultValues: {
        name: draft.name,
        key: draft.key,
        description: draft.description,
        managerId: draft.managerId || undefined,
        clientId: draft.clientId || undefined,
        startDate: draft.startDate,
        endDate: draft.endDate,
      },
    });

    const keyManuallyEditedRef = useRef(
      draft.key.length > 0 && draft.key !== generateProjectKey(draft.name),
    );

    const watchedStartDate = form.watch("startDate");
    const watchedName = form.watch("name");
    const watchedKey = form.watch("key");
    const watchedDescription = form.watch("description");

    useImperativeHandle(ref, () => ({
      async validate(): Promise<boolean> {
        const ok = await form.trigger();
        if (ok) {
          const v = form.getValues();
          updateDraft({
            name: v.name,
            key: v.key,
            description: v.description ?? "",
            managerId: v.managerId ?? "",
            clientId: v.clientId ?? "",
            startDate: v.startDate ?? "",
            endDate: v.endDate ?? "",
          });
        }
        return ok;
      },
    }));

    function handleFormSubmit(e: React.FormEvent) { e.preventDefault(); }

    function handleNameChange(
      name: string,
      onChange: (value: string) => void,
    ) {
      const capped = name.slice(0, PROJECT_NAME_MAX);
      onChange(capped);
      if (keyManuallyEditedRef.current) return;
      form.setValue("key", generateProjectKey(capped), {
        shouldValidate: false,
      });
    }

    function handleKeyChange(
      value: string,
      onChange: (value: string) => void,
    ) {
      keyManuallyEditedRef.current = true;
      const sanitized = value
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, PROJECT_KEY_MAX);
      onChange(sanitized);
    }

    function handleStartDateChange(value: string) {
      form.setValue("startDate", value, { shouldValidate: true });
      const currentEnd = form.getValues("endDate") ?? "";
      const nextEnd = clearEndIfInvalid(value, currentEnd, "after");
      if (nextEnd !== currentEnd) {
        form.setValue("endDate", nextEnd, { shouldValidate: true });
      }
    }

    const startPickerBounds = planningStartPickerProps();
    const endPickerBounds = planningEndPickerProps({
      startDate: watchedStartDate,
      mode: "after",
    });

    return (
      <Form {...form}>
        <form className="space-y-4" onSubmit={handleFormSubmit}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Project Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <span className="text-xs">
                    {charCounter(watchedName, PROJECT_NAME_MAX)}
                  </span>
                </div>
                <FormControl>
                  <Input
                  data-project-create-name="true"
                  autoFocus
                    placeholder="e.g. Website Redesign"
                    maxLength={PROJECT_NAME_MAX}
                    {...field}
                    onChange={(e) =>
                      handleNameChange(e.target.value, field.onChange)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="key"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Project Key <span className="text-destructive">*</span>
                  </FormLabel>
                  <span className="text-xs">
                    {charCounter(watchedKey, PROJECT_KEY_MAX)}
                  </span>
                </div>
                <FormControl>
                  <Input
                    placeholder="e.g. WR"
                    maxLength={PROJECT_KEY_MAX}
                    {...field}
                    onChange={(e) =>
                      handleKeyChange(e.target.value, field.onChange)
                    }
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
                <div className="flex items-center justify-between">
                  <FormLabel>
                    Description{" "}
                    <span className="text-muted-foreground font-normal">
                      (Optional)
                    </span>
                  </FormLabel>
                  <span className="text-xs">
                    {charCounter(watchedDescription, PROJECT_DESCRIPTION_MAX)}
                  </span>
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Briefly describe the project goals..."
                    className="resize-none min-h-[80px]"
                    maxLength={PROJECT_DESCRIPTION_MAX}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="managerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Project Manager{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </FormLabel>
                <BasicsManagerField
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Client{" "}
                  <span className="text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </FormLabel>
                <BasicsClientField
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={handleStartDateChange}
                      placeholder="Start date"
                      dateFormat="dd/MM/yyyy"
                      fromDate={startPickerBounds.fromDate}
                      fromYear={startPickerBounds.fromYear}
                      toYear={startPickerBounds.toYear}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="End date"
                      dateFormat="dd/MM/yyyy"
                      fromDate={endPickerBounds.fromDate}
                      fromYear={endPickerBounds.fromYear}
                      toYear={endPickerBounds.toYear}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </form>
      </Form>
    );
  },
);
