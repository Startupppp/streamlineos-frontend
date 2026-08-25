"use client";

import { useCallback, useRef, useState, KeyboardEvent } from "react";
import { useForm, useController, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { territorySchema, type TerritoryFormValues } from "./territory-sheet-schema";
import { X } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetBody,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import type { Territory, TerritoryCriteria } from "@/hooks/api/crm-settings";

export type { TerritoryFormValues };

function criteriaFromForm(form: TerritoryFormValues): TerritoryCriteria {
  return {
    countries: form.countries.length > 0 ? form.countries : undefined,
    states: form.states.length > 0 ? form.states : undefined,
    cities: form.cities.length > 0 ? form.cities : undefined,
    postalCodes: form.postalCodes.length > 0 ? form.postalCodes : undefined,
    industries: form.industries.length > 0 ? form.industries : undefined,
    companySizes: form.companySizes.length > 0 ? form.companySizes : undefined,
    productKeys: form.productKeys.length > 0 ? form.productKeys : undefined,
    accountTypes: form.accountTypes.length > 0 ? form.accountTypes : undefined,
  };
}

function formFromTerritory(t: Territory): TerritoryFormValues {
  return {
    name: t.name,
    description: t.description ?? "",
    priority: String(t.priority),
    isActive: t.isActive,
    countries: t.criteria.countries ?? [],
    states: t.criteria.states ?? t.states ?? [],
    cities: t.criteria.cities ?? t.cities ?? [],
    postalCodes: t.criteria.postalCodes ?? [],
    industries: t.criteria.industries ?? [],
    companySizes: t.criteria.companySizes ?? [],
    productKeys: t.criteria.productKeys ?? [],
    accountTypes: t.criteria.accountTypes ?? [],
  };
}

export function buildTerritoryPayload(data: TerritoryFormValues) {
  return {
    name: data.name,
    description: data.description || undefined,
    priority: Number(data.priority),
    isActive: data.isActive,
    criteria: criteriaFromForm(data),
  };
}

interface ChipBadgeProps {
  chip: string;
  onRemove: (chip: string) => void;
}

function ChipBadge({ chip, onRemove }: ChipBadgeProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onRemove(chip); },
    [chip, onRemove]
  );
  return (
    <Badge variant="secondary" className="h-5 px-1.5 text-micro gap-0.5 shrink-0">
      {chip}
      <button
        type="button"
        aria-label={`Remove ${chip}`}
        onClick={handleClick}
        className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
}

interface ChipInputProps {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
}

function ChipInput({ value, onChange, placeholder, className }: ChipInputProps) {
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addChip = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      if (trimmed && !value.includes(trimmed)) {
        onChange([...value, trimmed]);
      }
      setInputVal("");
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addChip(inputVal);
      } else if (e.key === "Backspace" && inputVal === "" && value.length > 0) {
        onChange(value.slice(0, -1));
      }
    },
    [inputVal, addChip, value, onChange]
  );

  const handleBlur = useCallback(() => {
    if (inputVal.trim()) addChip(inputVal);
  }, [inputVal, addChip]);

  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleRemove = useCallback(
    (chip: string) => {
      onChange(value.filter((v) => v !== chip));
    },
    [value, onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setInputVal(e.target.value),
    []
  );

  return (
    <div
      onClick={handleContainerClick}
      className={cn(
        "flex flex-wrap gap-1 min-h-9 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm ring-offset-background",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text",
        className
      )}
    >
      {value.map((chip) => (
        <ChipBadge key={chip} chip={chip} onRemove={handleRemove} />
      ))}
      <input
        ref={inputRef}
        value={inputVal}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="flex-1 min-w-[80px] bg-transparent outline-none text-xs placeholder:text-muted-foreground"
      />
    </div>
  );
}

type CriteriaFieldName = "countries" | "states" | "cities" | "postalCodes" | "industries" | "companySizes" | "productKeys" | "accountTypes";

interface ChipFieldProps {
  name: CriteriaFieldName;
  label: string;
  placeholder: string;
  control: Control<TerritoryFormValues>;
}

function ChipField({ name, label, placeholder, control }: ChipFieldProps) {
  const { field } = useController({ name, control });
  const chips: string[] = field.value ?? [];

  const handleChange = useCallback(
    (v: string[]) => field.onChange(v),
    [field]
  );

  return (
    <FormField
      control={control}
      name={name}
      render={() => (
        <FormItem>
          <FormLabel className="text-xs">{label}</FormLabel>
          <FormControl>
            <ChipInput
              value={chips}
              onChange={handleChange}
              placeholder={placeholder}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface TerritorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Territory | null;
  isPending: boolean;
  onSubmit: (data: TerritoryFormValues) => void;
}

const EMPTY_DEFAULTS: TerritoryFormValues = {
  name: "",
  description: "",
  priority: "0",
  isActive: true,
  countries: [],
  states: [],
  cities: [],
  postalCodes: [],
  industries: [],
  companySizes: [],
  productKeys: [],
  accountTypes: [],
};

const CRITERIA_FIELDS: Array<{
  name: CriteriaFieldName;
  label: string;
  placeholder: string;
}> = [
  { name: "countries", label: "Countries", placeholder: "India, US… press Enter" },
  { name: "states", label: "States", placeholder: "Maharashtra, California…" },
  { name: "cities", label: "Cities", placeholder: "Mumbai, San Francisco…" },
  { name: "postalCodes", label: "Postal Codes", placeholder: "400001, 94102…" },
  { name: "industries", label: "Industries", placeholder: "Technology, Finance…" },
  { name: "companySizes", label: "Company Sizes", placeholder: "1-10, 11-50…" },
  { name: "productKeys", label: "Products", placeholder: "CRM, ERP…" },
  { name: "accountTypes", label: "Account Types", placeholder: "enterprise, smb…" },
];

export function TerritorySheet({
  open,
  onOpenChange,
  editing,
  isPending,
  onSubmit,
}: TerritorySheetProps) {
  const form = useForm<TerritoryFormValues>({
    resolver: zodResolver(territorySchema),
    defaultValues: editing ? formFromTerritory(editing) : EMPTY_DEFAULTS,
  });

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) form.reset(editing ? formFromTerritory(editing) : EMPTY_DEFAULTS);
      onOpenChange(next);
    },
    [form, editing, onOpenChange]
  );

  const handleSubmit = useCallback(
    (data: TerritoryFormValues) => {
      onSubmit(data);
    },
    [onSubmit]
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <SheetTitle>{editing ? "Edit Territory" : "New Territory"}</SheetTitle>
        </SheetHeader>
        <SheetBody className="px-6 py-5">
          <Form {...form}>
            <form id="territory-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. West India" className="" />
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
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Optional description"
                        className="resize-none min-h-[72px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end pb-1">
                      <FormLabel>Active</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-medium mb-3">Criteria</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Type a value and press Enter or comma to add. Click × to remove.
                </p>
                <div className="space-y-3">
                  {CRITERIA_FIELDS.map((cf) => (
                    <ChipField
                      key={cf.name}
                      name={cf.name}
                      label={cf.label}
                      placeholder={cf.placeholder}
                      control={form.control}
                    />
                  ))}
                </div>
              </div>
            </form>
          </Form>
        </SheetBody>
        <SheetFooter className="shrink-0 border-t border-border bg-muted/30 px-6 py-4">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              form="territory-form"
              isPending={isPending}
              loadingText="Saving..."
            >
              {editing ? "Save Changes" : "Create Territory"}
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
