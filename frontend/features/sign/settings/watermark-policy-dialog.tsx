"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateWatermarkPolicy } from "@/hooks/api/sign/settings";
import {
  watermarkPolicySchema,
  type WatermarkPolicyValues,
  ENVELOPE_STATES,
} from "./watermark-policy-schema";
import { setListMembership } from "@/lib/toggle-in-list";

function applyToState(
  onChange: (states: string[]) => void,
  applied: string[],
  state: string,
): (checked: boolean | "indeterminate") => void {
  return function handleWatermarkStateToggle(checked) {
    onChange(setListMembership(applied, state, checked !== false));
  };
}

export function WatermarkPolicyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useCreateWatermarkPolicy();

  const form = useForm<WatermarkPolicyValues>({
    resolver: zodResolver(watermarkPolicySchema),
    defaultValues: {
      text: "CONFIDENTIAL",
      states: ["draft"],
      showOnFinalPdf: false,
    },
  });

  async function handleSubmit(values: WatermarkPolicyValues) {
    try {
      await create.mutateAsync({
        scopeType: "tenant",
        appliesStates: values.states,
        text: values.text,
        opacity: 30,
        angle: 45,
        color: "#94A3B8",
        fontSize: 36,
        showOnFinalPdf: values.showOnFinalPdf,
        previewOnly: !values.showOnFinalPdf,
        enabled: true,
      });
      toast.success("Watermark policy created");
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New watermark policy</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Text <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="states"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Apply to states <span className="text-destructive">*</span>
                  </FormLabel>
                  <div className="space-y-2">
                    {ENVELOPE_STATES.map((state) => (
                      <label key={state} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                        <Checkbox
                          checked={field.value.includes(state)}
                          onCheckedChange={applyToState(field.onChange, field.value, state)}
                        />
                        {state}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="showOnFinalPdf"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(v === true)}
                    />
                    Include on the final signed PDF (not just preview)
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={create.isPending} loadingText="Creating…">
                Create
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
