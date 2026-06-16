"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { COUNTRIES, STATES_BY_COUNTRY } from "@/lib/constants/geography";

export const EMPTY_FORM = {
  name: "",
  code: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  address: "",
  phone: "",
  email: "",
};

export type BranchFormData = typeof EMPTY_FORM;
export type FormErrors = Partial<Record<keyof BranchFormData, string>>;

const CODE_REGEX = /^[A-Z0-9]{2,20}$/;
const PINCODE_REGEX = /^[A-Za-z0-9]{4,10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEXT_FIELD_REGEX = /^(?!.*\s{2})[a-zA-Z][a-zA-Z0-9\s\-&,.()'\/]*$/;
const HAS_LETTER_REGEX = /[a-zA-Z]/;

export function validateBranchForm(
  data: BranchFormData,
  setErrors: (e: FormErrors) => void,
): BranchFormData | null {
  const trimmed: BranchFormData = {
    name: data.name.trim(),
    code: data.code.trim().toUpperCase(),
    city: data.city.trim(),
    state: data.state.trim(),
    country: data.country.trim(),
    pincode: data.pincode.trim(),
    address: data.address.trim(),
    phone: data.phone.trim(),
    email: data.email.trim().toLowerCase(),
  };

  const errors: FormErrors = {};

  if (!trimmed.name) {
    errors.name = "Branch name is required";
  } else if (!HAS_LETTER_REGEX.test(trimmed.name)) {
    errors.name = "Branch name must contain at least one letter";
  } else if (trimmed.name.length > 100) {
    errors.name = "Branch name must be at most 100 characters";
  } else if (!TEXT_FIELD_REGEX.test(trimmed.name)) {
    errors.name =
      "Branch name must start with a letter, no consecutive spaces, and only letters, numbers, and basic punctuation";
  }

  if (!trimmed.code) {
    errors.code = "Branch code is required";
  } else if (!CODE_REGEX.test(trimmed.code)) {
    errors.code = "Use 2–20 alphanumeric characters (letters and numbers only)";
  }

  if (trimmed.city) {
    if (!HAS_LETTER_REGEX.test(trimmed.city)) {
      errors.city = "City must contain at least one letter";
    } else if (trimmed.city.length > 100) {
      errors.city = "City must be at most 100 characters";
    } else if (!TEXT_FIELD_REGEX.test(trimmed.city)) {
      errors.city =
        "City name must start with a letter and contain only letters, spaces, and basic punctuation";
    }
  }

  if (trimmed.state) {
    if (!HAS_LETTER_REGEX.test(trimmed.state)) {
      errors.state = "State must contain at least one letter";
    } else if (trimmed.state.length > 100) {
      errors.state = "State must be at most 100 characters";
    } else if (!TEXT_FIELD_REGEX.test(trimmed.state)) {
      errors.state =
        "State name must start with a letter and contain only letters, spaces, and basic punctuation";
    }
  }

  if (trimmed.pincode && !PINCODE_REGEX.test(trimmed.pincode)) {
    errors.pincode =
      "Enter a valid pin code (4–10 alphanumeric characters, no spaces or special characters)";
  }

  if (trimmed.address && trimmed.address.length > 500) {
    errors.address = "Address must be at most 500 characters";
  }

  if (trimmed.phone) {
    const digitsOnly = trimmed.phone.replace(/[+\s-]/g, "");
    if (/[a-zA-Z]/.test(trimmed.phone)) {
      errors.phone = "Phone number must not contain letters";
    } else if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      errors.phone = "Phone number must have 7–15 digits";
    }
  }

  if (trimmed.email && !EMAIL_REGEX.test(trimmed.email)) {
    errors.email = "Enter a valid email address";
  }

  setErrors(errors);
  if (Object.keys(errors).length > 0) return null;
  return trimmed;
}

function CountrySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal h-9 text-sm"
        >
          <span className="truncate">{value || "Select country"}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList className="max-h-56">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {COUNTRIES.map((c) => (
                <CommandItem key={c} value={c} onSelect={handleSelect}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === c ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {c}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function StateSelect({
  country,
  value,
  onChange,
  textValue,
  onTextChange,
  error,
}: {
  country: string;
  value: string;
  onChange: (v: string) => void;
  textValue: string;
  onTextChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  const states = STATES_BY_COUNTRY[country];
  if (!states) {
    return (
      <>
        <Input
          value={textValue}
          onChange={onTextChange}
          placeholder="e.g., Maharashtra"
        />
        {error && <p className="text-[11px] text-destructive">{error}</p>}
      </>
    );
  }
  return (
    <>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Select state" />
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {states.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </>
  );
}

interface BranchFormFieldsProps {
  data: BranchFormData;
  errors: FormErrors;
  onFieldChange: (
    key: keyof BranchFormData,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFieldSet: (key: keyof BranchFormData, value: string) => void;
}

export function BranchFormFields({
  data,
  errors,
  onFieldChange,
  onFieldSet,
}: BranchFormFieldsProps) {
  function handleCountryChange(v: string) {
    onFieldSet("country", v);
    onFieldSet("state", "");
  }

  function handleStateChange(v: string) {
    onFieldSet("state", v);
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Branch Name *</Label>
          <Input
            value={data.name}
            onChange={onFieldChange("name")}
            placeholder="e.g., Mumbai Office"
          />
          {errors.name && (
            <p className="text-[11px] text-destructive">{errors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Branch Code *</Label>
          <Input
            value={data.code}
            onChange={onFieldChange("code")}
            placeholder="e.g., MUM01"
          />
          {errors.code && (
            <p className="text-[11px] text-destructive">{errors.code}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Country</Label>
          <CountrySelect value={data.country} onChange={handleCountryChange} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Pincode</Label>
          <Input
            value={data.pincode}
            onChange={onFieldChange("pincode")}
            placeholder="e.g., 400001"
          />
          {errors.pincode && (
            <p className="text-[11px] text-destructive">{errors.pincode}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">State</Label>
          <StateSelect
            country={data.country}
            value={data.state}
            onChange={handleStateChange}
            textValue={data.state}
            onTextChange={onFieldChange("state")}
            error={errors.state}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">City</Label>
          <Input
            value={data.city}
            onChange={onFieldChange("city")}
            placeholder="e.g., Mumbai"
          />
          {errors.city && (
            <p className="text-[11px] text-destructive">{errors.city}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Address</Label>
        <Input
          value={data.address}
          onChange={onFieldChange("address")}
          placeholder="Full street address"
          maxLength={500}
        />
        {errors.address && (
          <p className="text-[11px] text-destructive">{errors.address}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Phone</Label>
          <Input
            value={data.phone}
            onChange={onFieldChange("phone")}
            placeholder="e.g., +91 9876543210"
          />
          {errors.phone && (
            <p className="text-[11px] text-destructive">{errors.phone}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Email</Label>
          <Input
            value={data.email}
            onChange={onFieldChange("email")}
            placeholder="branch@company.com"
          />
          {errors.email && (
            <p className="text-[11px] text-destructive">{errors.email}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface BranchEditSheetProps {
  open: boolean;
  title: string;
  data: BranchFormData;
  errors: FormErrors;
  isPending: boolean;
  isDisabled: boolean;
  onOpenChange: (open: boolean) => void;
  onFieldChange: (
    key: keyof BranchFormData,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFieldSet: (key: keyof BranchFormData, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
}

export function BranchEditSheet({
  open,
  title,
  data,
  errors,
  isPending,
  isDisabled,
  onOpenChange,
  onFieldChange,
  onFieldSet,
  onSubmit,
  onCancel,
  submitLabel,
}: BranchEditSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md p-0 gap-0">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-sm">{title}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 min-h-0">
          <BranchFormFields
            data={data}
            errors={errors}
            onFieldChange={onFieldChange}
            onFieldSet={onFieldSet}
          />
        </ScrollArea>

        <div className="shrink-0 border-t px-4 py-3 bg-background">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={isDisabled || isPending}
              onClick={onSubmit}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
