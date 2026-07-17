"use client";

import { useCallback, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  MapPin,
  Building2,
  User,
  Target,
  IndianRupee,
  StickyNote,
  UserPlus,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { useCheckLeadDuplicates } from "@/hooks/api/leads";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetTrigger,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TruncatedText } from "@/components/ui/truncated-text";
import { CrmOptionSelect } from "@/features/crm/shared/metadata";

const schema = z
  .object({
    name: z.string().trim().min(1, "Full name is required"),
    email: z
      .string()
      .trim()
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: "Enter a valid email",
      }),
    phone: z.string(),
    company: z.string(),
    city: z.string(),
    priority: z.string().min(1, "Priority is required"),
    source: z.string().min(1, "Source is required"),
    referredBy: z.string(),
    potentialValue: z
      .string()
      .refine((v) => v === "" || /^\d+(\.\d+)?$/.test(v), {
        message: "Must be a positive number",
      }),
    investmentInterest: z
      .string()
      .refine((v) => v === "" || /^\d+(\.\d+)?$/.test(v), {
        message: "Must be a positive number",
      }),
    notes: z.string(),
  })
  .refine(
    (d) => d.source !== "referral" || d.referredBy.trim().length > 0,
    { message: "Referred By is required when source is Referral", path: ["referredBy"] },
  );

type FormValues = z.infer<typeof schema>;

export interface CreateLeadFormValues {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  city?: string;
  priority: string;
  source: string;
  referredBy?: string;
  potentialValue?: number;
  investmentInterest?: number;
  notes?: string;
}

interface CreateLeadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateLeadFormValues) => void;
  isPending: boolean;
}

export function CreateLeadSheet({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateLeadSheetProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      city: "",
      priority: "WARM",
      source: "referral",
      referredBy: "",
      potentialValue: "",
      investmentInterest: "",
      notes: "",
    },
  });

  const watchedEmail = form.watch("email");
  const watchedPhone = form.watch("phone");
  const watchedSource = form.watch("source");

  const debouncedEmail = useDebouncedValue(watchedEmail, 500);
  const debouncedPhone = useDebouncedValue(watchedPhone, 500);

  const { data: dupCheck } = useCheckLeadDuplicates(
    { email: debouncedEmail || undefined, phone: debouncedPhone || undefined },
    { enabled: open && (!!debouncedEmail || !!debouncedPhone) },
  );
  const hasDuplicates = (dupCheck?.duplicates?.length ?? 0) > 0;

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  function handleSubmit(values: FormValues) {
    onSubmit({
      name: values.name,
      email: values.email || undefined,
      phone: values.phone || undefined,
      company: values.company || undefined,
      city: values.city || undefined,
      priority: values.priority,
      source: values.source,
      referredBy: values.referredBy || undefined,
      potentialValue: values.potentialValue ? Number(values.potentialValue) : undefined,
      investmentInterest: values.investmentInterest ? Number(values.investmentInterest) : undefined,
      notes: values.notes || undefined,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button className="shadow-lg">
          <Plus className="h-4 w-4 mr-2" />
          New Lead
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-[480px]">
        <SheetHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold">
                Create New Lead
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add a new lead to your pipeline
              </p>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="px-0">
          <form
            id="create-lead-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="px-6 py-4 space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Contact Information</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label
                    htmlFor="name"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Full Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter full name"
                    {...form.register("name")}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="email"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      className="pl-9"
                      {...form.register("email")}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="phone"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Phone
                  </Label>
                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <PhoneInput
                        id="phone"
                        defaultCountry="IN"
                        placeholder="Enter phone number"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <div>
                  <Label
                    htmlFor="company"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Company
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      placeholder="Acme Corp"
                      className="pl-9"
                      {...form.register("company")}
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="city"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    City
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="city"
                      placeholder="Mumbai"
                      className="pl-9"
                      {...form.register("city")}
                    />
                  </div>
                </div>
              </div>
            </div>

            {hasDuplicates && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    Possible duplicate
                    {dupCheck!.duplicates.length > 1 ? "s" : ""} found
                  </span>
                </div>
                <div className="space-y-1.5">
                  {dupCheck!.duplicates.map((dup) => (
                    <div
                      key={dup.id}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <TruncatedText text={dup.name} className="font-medium" />
                      <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                        {dup.email && (
                          <span className="text-muted-foreground truncate max-w-[140px]">
                            {dup.email}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0"
                        >
                          {dup.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  You can still create this lead if it&apos;s a different
                  person.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Target className="h-4 w-4" />
                <span>Lead Classification</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">
                    Priority
                  </Label>
                  <Controller
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <CrmOptionSelect
                        type="priority"
                        value={field.value}
                        onChange={field.onChange}
                        className="w-full"
                      />
                    )}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1.5 block">
                    Source
                  </Label>
                  <Controller
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <CrmOptionSelect
                        type="source"
                        value={field.value}
                        onChange={field.onChange}
                        className="w-full"
                      />
                    )}
                  />
                </div>

                {watchedSource === "referral" && (
                  <div className="col-span-2">
                    <Label
                      htmlFor="referredBy"
                      className="text-xs font-medium mb-1.5 block"
                    >
                      Referred By <span className="text-red-400">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="referredBy"
                        placeholder="Name of person who referred this lead"
                        className="pl-9"
                        {...form.register("referredBy")}
                      />
                    </div>
                    {form.formState.errors.referredBy && (
                      <p className="text-xs text-destructive mt-1">
                        {form.formState.errors.referredBy.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <IndianRupee className="h-4 w-4" />
                <span>Financial Details</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor="potentialValue"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Potential Value (₹)
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="potentialValue"
                      placeholder="5,00,000"
                      className="pl-9"
                      {...form.register("potentialValue")}
                    />
                  </div>
                  {form.formState.errors.potentialValue && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.potentialValue.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label
                    htmlFor="investmentInterest"
                    className="text-xs font-medium mb-1.5 block"
                  >
                    Investment Interest (₹)
                  </Label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="investmentInterest"
                      placeholder="10,00,000"
                      className="pl-9"
                      {...form.register("investmentInterest")}
                    />
                  </div>
                  {form.formState.errors.investmentInterest && (
                    <p className="text-xs text-destructive mt-1">
                      {form.formState.errors.investmentInterest.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <StickyNote className="h-4 w-4" />
                <span>Additional Notes</span>
              </div>
              <Textarea
                id="notes"
                placeholder="Any additional context about this lead..."
                rows={3}
                className="resize-none"
                {...form.register("notes")}
              />
            </div>
          </form>
        </SheetBody>

        <SheetFooter className="px-6 py-3 border-t shrink-0">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="create-lead-form"
            className="flex-1"
            isPending={isPending}
            loadingText="Creating..."
          >
            Create Lead
          </LoadingButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
