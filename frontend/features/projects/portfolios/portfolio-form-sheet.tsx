"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import type { OrgMember } from "@/types/organization";
import type { Portfolio, CreatePortfolioInput, UpdatePortfolioInput, PortfolioStatus, PortfolioHealth } from "@/types/projects";

const NONE_SENTINEL = "__none__";

function optionalSelectValue(value: string) {
  return value || NONE_SENTINEL;
}

function optionalSelectChange(value: string) {
  return value === NONE_SENTINEL ? "" : value;
}

const schema = z.object({
  name: z.string().min(1, "Required").max(200),
  description: z.string(),
  ownerId: z.string(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.string(),
  strategicGoal: z.string(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  name: "", description: "", ownerId: "", status: "active", health: "", strategicGoal: "",
};

function toForm(p: Portfolio): FormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    ownerId: p.ownerId ?? "",
    status: p.status,
    health: p.health ?? "",
    strategicGoal: p.strategicGoal ?? "",
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues?: Portfolio;
  onSubmitCreate: (input: CreatePortfolioInput) => void;
  onSubmitEdit: (input: UpdatePortfolioInput & { id: number }) => void;
  isPending?: boolean;
  members: OrgMember[];
}

export function PortfolioFormSheet({ open, onOpenChange, mode, defaultValues, onSubmitCreate, onSubmitEdit, isPending, members }: Props) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    if (open) form.reset(mode === "edit" && defaultValues ? toForm(defaultValues) : DEFAULTS);
  }, [open, mode, defaultValues, form]);

  function handleSubmit(v: FormValues) {
    const base = {
      name: v.name,
      status: v.status as PortfolioStatus,
      ...(v.description ? { description: v.description } : {}),
      ...(v.ownerId ? { ownerId: v.ownerId } : {}),
      ...(v.health ? { health: v.health as PortfolioHealth } : {}),
      ...(v.strategicGoal ? { strategicGoal: v.strategicGoal } : {}),
    };
    if (mode === "edit" && defaultValues) {
      onSubmitEdit({ id: defaultValues.id, ...base });
    } else {
      onSubmitCreate(base as CreatePortfolioInput);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{mode === "edit" ? "Edit Portfolio" : "New Portfolio"}</SheetTitle>
          <SheetDescription>{mode === "edit" ? "Update portfolio details." : "Create a workspace-level portfolio to group projects."}</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-y-auto">
            <div className="flex-1 px-6 py-5 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Portfolio name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Describe this portfolio…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="health" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Health (optional)</FormLabel>
                    <Select
                      value={optionalSelectValue(field.value)}
                      onValueChange={(v) => field.onChange(optionalSelectChange(v))}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value={NONE_SENTINEL}>None</SelectItem>
                        <SelectItem value="on_track">On Track</SelectItem>
                        <SelectItem value="at_risk">At Risk</SelectItem>
                        <SelectItem value="off_track">Off Track</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="ownerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner (optional)</FormLabel>
                  <Select
                    value={optionalSelectValue(field.value)}
                    onValueChange={(v) => field.onChange(optionalSelectChange(v))}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_SENTINEL}>None</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>{m.name ?? m.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="strategicGoal" render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategic Goal (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Describe the strategic objective…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
                <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Saving…">
                  {mode === "edit" ? "Save Changes" : "Create Portfolio"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
