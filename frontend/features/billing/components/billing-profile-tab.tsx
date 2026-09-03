"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import { useBillingProfile, useUpdateBillingProfile } from "@/hooks/api/subscription";
import { useCan } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { upperCaseFieldChange } from "@/lib/case-field";

const billingProfileSchema = z.object({
  billingName: z.string().max(200).nullable(),
  billingEmail: z.string().email("Invalid email").max(200).nullable().or(z.literal("")),
  gstin: z
    .string()
    .max(15)
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$|^$/, {
      message: "Invalid GSTIN format",
    })
    .nullable(),
  pan: z
    .string()
    .max(10)
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$|^$/, { message: "Invalid PAN format" })
    .nullable(),
  addressLine1: z.string().max(200).nullable(),
  addressLine2: z.string().max(200).nullable(),
  city: z.string().max(100).nullable(),
  state: z.string().max(100).nullable(),
  pincode: z.string().max(10).nullable(),
  country: z.string().length(2, "Must be a 2-letter ISO country code"),
  isTaxExempt: z.boolean(),
});

type BillingProfileFormValues = z.infer<typeof billingProfileSchema>;

function BillingProfileSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
      <Skeleton className="h-4 w-32" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

function toNullableText(v: string | null): string | null {
  return v === "" ? null : v;
}

export function BillingProfileTab() {
  const canView = useCan("billing:profile:view");
  const canUpdate = useCan("billing:profile:update");

  const {
    data: profile,
    isLoading,
    isError,
    error,
    refetch,
  } = useBillingProfile();

  const { mutate: updateProfile, isPending } = useUpdateBillingProfile();

  const form = useForm<BillingProfileFormValues>({
    resolver: zodResolver(billingProfileSchema),
    values: {
      billingName: profile?.billingName ?? null,
      billingEmail: profile?.billingEmail ?? null,
      gstin: profile?.gstin ?? null,
      pan: profile?.pan ?? null,
      addressLine1: profile?.addressLine1 ?? null,
      addressLine2: profile?.addressLine2 ?? null,
      city: profile?.city ?? null,
      state: profile?.state ?? null,
      pincode: profile?.pincode ?? null,
      country: profile?.country ?? "IN",
      isTaxExempt: profile?.isTaxExempt ?? false,
    },
  });

  function handleSubmit(values: BillingProfileFormValues) {
    updateProfile({
      ...values,
      billingName: toNullableText(values.billingName),
      billingEmail: toNullableText(values.billingEmail),
      gstin: toNullableText(values.gstin),
      pan: toNullableText(values.pan),
      addressLine1: toNullableText(values.addressLine1),
      addressLine2: toNullableText(values.addressLine2),
      city: toNullableText(values.city),
      state: toNullableText(values.state),
      pincode: toNullableText(values.pincode),
    }, {
      onSuccess: () => toast.success("Billing profile saved"),
      onError: (err) => toast.error(getErrorMessage(err)),
    });
  }

  function handleRetry() {
    void refetch();
  }

  if (!canView)
    return <NoPermissionState permission="billing:profile:view" />;

  if (isLoading) {
    return <BillingProfileSkeleton />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Failed to load billing profile"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
        className="flex-1"
      />
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-xl border border-border bg-card shadow-sm p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Billing Profile</h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billingName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Company or individual name"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        type="email"
                        placeholder="billing@company.com"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GSTIN</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="22AAAAA0000A1Z5"
                        className="h-9 font-mono uppercase"
                        maxLength={15}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PAN</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="ABCDE1234F"
                        className="h-9 font-mono uppercase"
                        maxLength={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="addressLine1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Street address"
                      className="h-9"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="addressLine2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Suite, floor, etc."
                      className="h-9"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="City"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="State"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="000000"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country <span className="text-destructive">*</span></FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value}
                      placeholder="IN"
                      maxLength={2}
                      className="h-9 uppercase"
                      onChange={upperCaseFieldChange(field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isTaxExempt"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <FormLabel className="text-sm font-medium">Tax Exempt</FormLabel>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Mark this organization as tax exempt
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-2">
              <LoadingButton
                type="submit"
                size="sm"
                isPending={isPending}
                loadingText="Saving…"
                disabled={!canUpdate}
              >
                Save Profile
              </LoadingButton>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
