"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormSheetChrome, MemberPicker } from "@/components/shared";
import { usePortfolios } from "@/hooks/api/build";
import type { Program, CreateProgramInput, UpdateProgramInput } from "@/types/projects";
import { programFormSchema, type ProgramFormValues } from "./program-form-schema";

const DEFAULTS: ProgramFormValues = {
  name: "",
  description: "",
  ownerId: "",
  portfolioId: "",
  status: "active",
  health: "",
};

function toForm(p: Program): ProgramFormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    ownerId: p.ownerId ?? "",
    portfolioId: p.portfolioId === null ? "" : String(p.portfolioId),
    status: p.status,
    health: p.health ?? "",
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues?: Program;
  onSubmitCreate: (input: CreateProgramInput) => void;
  onSubmitEdit: (input: UpdateProgramInput & { id: number }) => void;
  isPending?: boolean;
}

const HEALTH_VALUES = ["on_track", "at_risk", "off_track"] as const;

export function ProgramFormSheet({
  open,
  onOpenChange,
  mode,
  defaultValues,
  onSubmitCreate,
  onSubmitEdit,
  isPending,
}: Props) {
  const form = useForm<ProgramFormValues>({
    resolver: zodResolver(programFormSchema),
    defaultValues: DEFAULTS,
  });
  const { data: portfoliosPage } = usePortfolios();
  const portfolios = portfoliosPage?.data ?? [];

  useEffect(() => {
    if (open) form.reset(mode === "edit" && defaultValues ? toForm(defaultValues) : DEFAULTS);
  }, [open, mode, defaultValues, form]);

  function handleSubmit(v: ProgramFormValues) {
    const healthValue = HEALTH_VALUES.find((h) => h === v.health);
    const portfolioId = v.portfolioId ? Number(v.portfolioId) : undefined;
    const base: CreateProgramInput = {
      name: v.name,
      status: v.status,
      ...(v.description ? { description: v.description } : {}),
      ...(v.ownerId ? { ownerId: v.ownerId } : {}),
      ...(portfolioId ? { portfolioId } : {}),
      ...(healthValue ? { health: healthValue } : {}),
    };
    if (mode === "edit" && defaultValues) {
      onSubmitEdit({ id: defaultValues.id, ...base });
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
      title={mode === "edit" ? "Edit Program" : "New Program"}
      description={
        mode === "edit"
          ? "Update program details."
          : "Group related projects into a program of work."
      }
      footer={
        <div className="grid w-full grid-cols-2 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="program-form"
            size="sm"
            isPending={isPending}
            loadingText="Saving…"
          >
            {mode === "edit" ? "Save Changes" : "Create Program"}
          </LoadingButton>
        </div>
      }
    >
      <Form {...form}>
        <form
          id="program-form"
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
                  <Input {...field} placeholder="Program name" />
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
                  <Textarea {...field} rows={3} placeholder="Describe this program…" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="portfolioId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portfolio (optional)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="No portfolio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
                    {(portfolios ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Not set" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
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
                  <MemberPicker value={field.value} onChange={field.onChange} />
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
