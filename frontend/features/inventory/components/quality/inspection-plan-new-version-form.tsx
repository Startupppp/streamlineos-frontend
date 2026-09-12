"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LoadingButton } from "@/components/ui/loading-button";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreatePlanVersion } from "@/hooks/api/inventory/inspection-plans";
import {
  SAMPLING_METHODS,
  SAMPLING_METHOD_LABEL,
  planVersionFormSchema,
  type PlanVersionFormValues,
} from "./inspection-plan-schema";

interface NewVersionFormProps {
  planId: number;
  onDone: () => void;
}

export function NewVersionForm({ planId, onDone }: NewVersionFormProps) {
  const createVersion = useCreatePlanVersion();
  const form = useForm<PlanVersionFormValues>({
    resolver: zodResolver(planVersionFormSchema),
    defaultValues: { samplingMethod: "ALL", sampleValue: "", instructions: "", activate: true },
  });
  const samplingMethod = form.watch("samplingMethod");

  function handleSubmit(values: PlanVersionFormValues): void {
    createVersion.mutate(
      {
        planId,
        payload: {
          samplingMethod: values.samplingMethod,
          ...(values.samplingMethod === "ALL" ? {} : { sampleValue: values.sampleValue?.trim() }),
          ...(values.instructions ? { instructions: values.instructions } : {}),
          activate: values.activate,
        },
      },
      {
        onSuccess: () => {
          toast.success(values.activate ? "Version published" : "Draft version saved");
          onDone();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-4 rounded-xl border border-border/70 bg-card p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="samplingMethod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sampling</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
                    {SAMPLING_METHODS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {SAMPLING_METHOD_LABEL[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {samplingMethod === "ALL" ? null : (
            <FormField
              control={form.control}
              name="sampleValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {samplingMethod === "PERCENTAGE" ? "Percentage" : "Units per delivery"}
                  </FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <FormField
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inspector instructions</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="activate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between gap-2 rounded-md border border-border/70 px-3 py-2">
              <div className="space-y-0.5">
                <FormLabel>Publish now</FormLabel>
                <FormDescription>Supersedes the version that is live today.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <LoadingButton type="submit" isPending={createVersion.isPending}>
            Save version
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}
