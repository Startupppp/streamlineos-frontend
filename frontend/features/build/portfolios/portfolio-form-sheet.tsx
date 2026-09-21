"use client";

import { useEffect } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormSheetChrome, MemberPicker } from "@/components/shared";
import type { Portfolio, CreatePortfolioInput, UpdatePortfolioInput } from "@/types/projects";

const schema = z.object({
  name: z.string().min(1, "Required").max(200),
  description: z.string(),
  ownerId: z.string(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.enum(["", "on_track", "at_risk", "off_track"]),
  strategicGoal: z.string(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  name: "", description: "", ownerId: "", status: "active", health: "", strategicGoal: "",
};

const PORTFOLIO_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
const PORTFOLIO_HEALTHS = ["", "on_track", "at_risk", "off_track"] as const;

function toForm(p: Portfolio): FormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    ownerId: p.ownerId ?? "",
    status: PORTFOLIO_STATUSES.find((v) => v === p.status) ?? "active",
    health: PORTFOLIO_HEALTHS.find((v) => v === (p.health ?? "")) ?? "",
    strategicGoal: p.strategicGoal ?? "",
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues?: Portfolio;
  onSubmitCreate: (input: CreatePortfolioInput) => void;
  onSubmitEdit: (input: UpdatePortfolioInput & { portfolioId: number }) => void;
  isPending?: boolean;
}

export function PortfolioFormSheet({
  open,
  onOpenChange,
  mode,
  defaultValues,
  onSubmitCreate,
  onSubmitEdit,
  isPending,
}: Props) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  useRegisterDirtyState(open && form.formState.isDirty);

  useEffect(() => {
    if (open) form.reset(mode === "edit" && defaultValues ? toForm(defaultValues) : DEFAULTS);
  }, [open, mode, defaultValues, form]);

  function handleSubmit(v: FormValues) {
    const HEALTH_VALUES = ["on_track", "at_risk", "off_track"] as const;
    const healthValue = HEALTH_VALUES.find((h) => h === v.health);
    const base: CreatePortfolioInput = {
      name: v.name,
      status: v.status,
      ...(v.description ? { description: v.description } : {}),
      ...(v.ownerId ? { ownerId: v.ownerId } : {}),
      ...(healthValue ? { health: healthValue } : {}),
      ...(v.strategicGoal ? { strategicGoal: v.strategicGoal } : {}),
    };
    if (mode === "edit" && defaultValues) {
      onSubmitEdit({ portfolioId: defaultValues.id, ...base });
    } else {
      onSubmitCreate(base);
    }
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <FormSheetChrome
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "edit" ? "Edit Portfolio" : "New Portfolio"}
      description={
        mode === "edit"
          ? "Update portfolio details."
          : "Create a workspace-level portfolio to group projects."
      }
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="portfolio-form"
            size="sm"
            isPending={isPending}
            loadingText="Saving…"
          >
            {mode === "edit" ? "Save Changes" : "Create Portfolio"}
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form
          id="portfolio-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="space-y-4"
          noValidate
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Portfolio name" />
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
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} placeholder="Describe this portfolio…" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_hold">On Hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="health"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Health (optional)</FormLabel>
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      <SelectItem value="on_track">On Track</SelectItem>
                      <SelectItem value="at_risk">At Risk</SelectItem>
                      <SelectItem value="off_track">Off Track</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="ownerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner (optional)</FormLabel>
                <FormControl>
                  <MemberPicker
                    mode="single"
                    value={field.value || undefined}
                    onChange={(id) => field.onChange(id ?? "")}
                    allowUnassigned
                    placeholder="Select owner"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="strategicGoal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Strategic Goal (optional)</FormLabel>
                <FormControl>
                  <Textarea {...field} rows={3} placeholder="Describe the strategic objective…" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </FormSheetChrome>
  );
}
