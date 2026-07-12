"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import type { Territory, TerritoryCriteria } from "@/hooks/api/crm-settings";

const territorySchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  description: z.string().optional(),
  priority: z.string().refine(
    (v) => !isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 100,
    "Must be 0–100"
  ),
  isActive: z.boolean(),
  assignedRepIds: z.string(),
  countries: z.string(),
  states: z.string(),
  cities: z.string(),
  postalCodes: z.string(),
  industries: z.string(),
  companySizes: z.string(),
  productKeys: z.string(),
  accountTypes: z.string(),
});

export type TerritoryFormValues = z.infer<typeof territorySchema>;

function criteriaFromForm(form: TerritoryFormValues): TerritoryCriteria {
  const split = (v: string) => v.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    countries: split(form.countries),
    states: split(form.states),
    cities: split(form.cities),
    postalCodes: split(form.postalCodes),
    industries: split(form.industries),
    companySizes: split(form.companySizes),
    productKeys: split(form.productKeys),
    accountTypes: split(form.accountTypes),
  };
}

function formFromTerritory(t: Territory): TerritoryFormValues {
  const join = (arr: string[] | undefined) => (arr ?? []).join(", ");
  return {
    name: t.name,
    description: t.description ?? "",
    priority: String(t.priority),
    isActive: t.isActive,
    assignedRepIds: (t.assignedReps ?? []).join(", "),
    countries: join(t.criteria.countries),
    states: join(t.criteria.states ?? t.states),
    cities: join(t.criteria.cities ?? t.cities),
    postalCodes: join(t.criteria.postalCodes),
    industries: join(t.criteria.industries),
    companySizes: join(t.criteria.companySizes),
    productKeys: join(t.criteria.productKeys),
    accountTypes: join(t.criteria.accountTypes),
  };
}

export function buildTerritoryPayload(data: TerritoryFormValues) {
  return {
    name: data.name,
    description: data.description || undefined,
    priority: Number(data.priority),
    isActive: data.isActive,
    assignedRepUserIds: data.assignedRepIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    criteria: criteriaFromForm(data),
  };
}

interface TerritorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Territory | null;
  isPending: boolean;
  onSubmit: (data: TerritoryFormValues) => void;
}

export function TerritorySheet({
  open,
  onOpenChange,
  editing,
  isPending,
  onSubmit,
}: TerritorySheetProps) {
  const form = useForm<TerritoryFormValues>({
    resolver: zodResolver(territorySchema),
    defaultValues: editing
      ? formFromTerritory(editing)
      : {
          name: "",
          description: "",
          priority: "0",
          isActive: true,
          assignedRepIds: "",
          countries: "",
          states: "",
          cities: "",
          postalCodes: "",
          industries: "",
          companySizes: "",
          productKeys: "",
          accountTypes: "",
        },
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) form.reset();
      onOpenChange(next);
    },
    [form, onOpenChange]
  );

  const handleSubmit = useCallback(
    (data: TerritoryFormValues) => {
      onSubmit(data);
    },
    [onSubmit]
  );

  const CRITERIA_FIELDS: Array<{ name: keyof TerritoryFormValues; label: string; placeholder: string }> = [
    { name: "countries", label: "Countries", placeholder: "India, US, UK" },
    { name: "states", label: "States", placeholder: "Maharashtra, California" },
    { name: "cities", label: "Cities", placeholder: "Mumbai, San Francisco" },
    { name: "postalCodes", label: "Postal Codes", placeholder: "400001, 94102" },
    { name: "industries", label: "Industries", placeholder: "Technology, Finance" },
    { name: "companySizes", label: "Company Sizes", placeholder: "1-10, 11-50" },
    { name: "productKeys", label: "Product Keys", placeholder: "CRM, ERP" },
    { name: "accountTypes", label: "Account Types", placeholder: "enterprise, smb" },
  ];

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col overflow-hidden">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit Territory" : "New Territory"}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4 px-1">
          <Form {...form}>
            <form id="territory-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. West India" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input {...field} placeholder="Optional description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority (0–100)</FormLabel>
                    <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex flex-col justify-end pb-1">
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="assignedRepIds" render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Rep IDs</FormLabel>
                  <FormControl><Input {...field} placeholder="1, 2, 3 (comma-separated)" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div>
                <p className="text-sm font-medium mb-2">Criteria (comma-separated values)</p>
                <div className="space-y-3">
                  {CRITERIA_FIELDS.map((cf) => (
                    <FormField key={cf.name} control={form.control} name={cf.name} render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">{cf.label}</FormLabel>
                        <FormControl><Input {...field} placeholder={cf.placeholder} className="text-xs h-8" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  ))}
                </div>
              </div>
            </form>
          </Form>
        </div>
        <SheetFooter className="border-t pt-4 flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <LoadingButton type="submit" form="territory-form" isPending={isPending} loadingText="Saving...">
            {editing ? "Save Changes" : "Create Territory"}
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
