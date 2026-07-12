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
import type { Portfolio, Program, CreateProgramInput, UpdateProgramInput, PortfolioStatus, PortfolioHealth } from "@/types/projects";

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
  portfolioId: z.string(),
  ownerId: z.string(),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  health: z.string(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  name: "", description: "", portfolioId: "", ownerId: "", status: "active", health: "",
};

function toForm(p: Program): FormValues {
  return {
    name: p.name,
    description: p.description ?? "",
    portfolioId: p.portfolioId != null ? String(p.portfolioId) : "",
    ownerId: p.ownerId ?? "",
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
  members: OrgMember[];
  portfolios: Pick<Portfolio, "id" | "name">[];
}

export function ProgramFormSheet({ open, onOpenChange, mode, defaultValues, onSubmitCreate, onSubmitEdit, isPending, members, portfolios }: Props) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  useEffect(() => {
    if (open) form.reset(mode === "edit" && defaultValues ? toForm(defaultValues) : DEFAULTS);
  }, [open, mode, defaultValues, form]);

  function handleSubmit(v: FormValues) {
    const base = {
      name: v.name,
      status: v.status as PortfolioStatus,
      ...(v.description ? { description: v.description } : {}),
      ...(v.portfolioId ? { portfolioId: parseInt(v.portfolioId, 10) } : {}),
      ...(v.ownerId ? { ownerId: v.ownerId } : {}),
      ...(v.health ? { health: v.health as PortfolioHealth } : {}),
    };
    if (mode === "edit" && defaultValues) {
      onSubmitEdit({ id: defaultValues.id, ...base });
    } else {
      onSubmitCreate(base as CreateProgramInput);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{mode === "edit" ? "Edit Program" : "New Program"}</SheetTitle>
          <SheetDescription>{mode === "edit" ? "Update program details." : "Create a program to group related projects."}</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-y-auto">
            <div className="flex-1 px-6 py-5 space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} placeholder="Program name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Describe this program…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="portfolioId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Portfolio (optional)</FormLabel>
                  <Select
                    value={optionalSelectValue(field.value)}
                    onValueChange={(v) => field.onChange(optionalSelectChange(v))}
                  >
                    <FormControl><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value={NONE_SENTINEL}>None</SelectItem>
                      {portfolios.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            </div>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
                <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Saving…">
                  {mode === "edit" ? "Save Changes" : "Create Program"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
