"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle } from "lucide-react";
import {
  Form,
  FormControl,
  FormDescription,
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
import { useProjects, useCheckProjectKeyAvailable } from "@/hooks/api/build/projects";

export type BasicsHandle = { validate: () => Promise<boolean>; setKeyError: (message: string) => void };

export const StepBasics = forwardRef<
  BasicsHandle,
  StepSharedProps & { onCancel?: () => void }
>(function StepBasicsRender({ draft, updateDraft, onCancel }, ref) {
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
    const [keyRemovedCharsNote, setKeyRemovedCharsNote] = useState<string | null>(null);
    const keyCheckAbortRef = useRef<AbortController | null>(null);
    const checkKeyAvailable = useCheckProjectKeyAvailable();

    useEffect(() => () => { keyCheckAbortRef.current?.abort(); }, []);

    const watchedStartDate = form.watch("startDate");
    const watchedName = form.watch("name");
    const watchedKey = form.watch("key");
    const watchedDescription = form.watch("description");

    const { data: projectsData } = useProjects();
    const duplicateNameWarning = useMemo(() => {
      const trimmed = watchedName?.trim().toLowerCase() ?? "";
      if (trimmed.length < 2) return false;
      return (projectsData?.data ?? []).some(
        (p) => p.name.trim().toLowerCase() === trimmed,
      );
    }, [watchedName, projectsData]);

    useImperativeHandle(ref, () => ({
      async validate(): Promise<boolean> {
        const ok = await form.trigger();
        if (!ok) return false;
        const v = form.getValues();
        try {
          const { available } = await checkKeyAvailable(v.key);
          if (!available) {
            form.setError("key", {
              type: "manual",
              message: `A project with key "${v.key}" already exists in this organization.`,
            });
            return false;
          }
        } catch {
        }
        updateDraft({
          name: v.name,
          key: v.key,
          description: v.description ?? "",
          managerId: v.managerId ?? "",
          clientId: v.clientId ?? "",
          startDate: v.startDate ?? "",
          endDate: v.endDate ?? "",
        });
        return true;
      },
      setKeyError(message: string): void {
        form.setError("key", { type: "manual", message });
      },
    }), [checkKeyAvailable, form, updateDraft]);

    function handleFormSubmit(e: React.FormEvent) { e.preventDefault(); }

    function handleNameChange(
      name: string,
      onChange: (value: string) => void,
    ) {
      const capped = name.slice(0, PROJECT_NAME_MAX);
      onChange(capped);
      if (form.getFieldState("name").error) {
        void form.trigger("name");
      }
      if (keyManuallyEditedRef.current) {
        updateDraft({ name: capped });
        return;
      }
      const nextKey = generateProjectKey(capped);
      form.setValue("key", nextKey, {
        shouldValidate: false,
      });
      updateDraft({ name: capped, key: nextKey });
    }

    function handleKeyChange(
      value: string,
      onChange: (value: string) => void,
    ) {
      keyManuallyEditedRef.current = true;
      const upper = value.toUpperCase();
      const removed = upper.replace(/[A-Z0-9]/g, "");
      const sanitized = upper.replace(/[^A-Z0-9]/g, "").slice(0, PROJECT_KEY_MAX);
      onChange(sanitized);
      if (removed.length > 0) {
        const unique = [...new Set(removed.split(""))].join(" ");
        setKeyRemovedCharsNote(`Removed characters that keys can't contain: ${unique}`);
      } else {
        setKeyRemovedCharsNote(null);
      }
      if (form.getFieldState("key").error) {
        void form.trigger("key");
      }
    }

    async function handleKeyBlur(fieldOnBlur: () => void) {
      fieldOnBlur();
      const key = form.getValues("key");
      if (form.getFieldState("key").invalid || key.length < 2) return;
      keyCheckAbortRef.current?.abort();
      keyCheckAbortRef.current = new AbortController();
      try {
        const { available } = await checkKeyAvailable(key, keyCheckAbortRef.current.signal);
        if (!available) {
          form.setError("key", {
            type: "manual",
            message: `A project with key "${key}" already exists in this organization.`,
          });
        }
      } catch {
      }
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
                    name={field.name}
                    value={field.value ?? ""}
                    onBlur={field.onBlur}
                    ref={field.ref}
                    placeholder="e.g. Website Redesign"
                    maxLength={PROJECT_NAME_MAX}
                    onChange={(e) =>
                      handleNameChange(e.target.value, field.onChange)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        onCancel?.();
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
                {duplicateNameWarning && (
                  <div className="flex items-start gap-1.5 rounded-md border border-status-warning-rule bg-status-warning-surface px-2.5 py-2 text-xs text-status-warning-ink-strong">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>A project with this name already exists. Project names can repeat—confirm this is intentional.</span>
                  </div>
                )}
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
                    name={field.name}
                    value={field.value ?? ""}
                    ref={field.ref}
                    onChange={(e) =>
                      handleKeyChange(e.target.value, field.onChange)
                    }
                    onBlur={() => void handleKeyBlur(field.onBlur)}
                  />
                </FormControl>
                <FormDescription>Letters A–Z and digits only; auto-uppercased.</FormDescription>
                {keyRemovedCharsNote ? (
                  <p className="text-xs text-muted-foreground">{keyRemovedCharsNote}</p>
                ) : null}
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
