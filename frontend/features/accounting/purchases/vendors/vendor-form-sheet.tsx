"use client";

import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { EntityFormSheet } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCreateVendor, useUpdateVendor } from "@/hooks/api/accounting/ap";
import type {
  SaveVendorInput,
  VendorDetail,
} from "@/types/accounting/accounting-ap";
import { textOrNull } from "../lib/form-values";
import { VendorFormFields } from "./vendor-form-fields";
import { vendorFormSchema, type VendorFormValues } from "./vendor-form-schema";

interface VendorFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: VendorDetail | null;
  defaultCurrency: string;
  defaultCountryCode: string;
}

export function VendorFormSheet({
  open,
  onOpenChange,
  vendor,
  defaultCurrency,
  defaultCountryCode,
}: VendorFormSheetProps) {
  const createVendor = useCreateVendor();
  const updateVendor = useUpdateVendor();

  const defaultValues = useMemo<VendorFormValues>(
    () => ({
      displayName: vendor?.displayName ?? "",
      legalName: vendor?.legalName ?? "",
      email: vendor?.email ?? "",
      phone: vendor?.phone ?? "",
      countryCode: vendor?.countryCode ?? defaultCountryCode,
      defaultCurrency: vendor?.defaultCurrency ?? defaultCurrency,
      billingCity: vendor?.billingCity ?? "",
      billingRegion: vendor?.billingRegion ?? "",
      defaultExpenseAccountId: vendor?.defaultExpenseAccountId ?? "",
      paymentTermsDays: String(vendor?.paymentTermsDays ?? 30),
      withholdingCode: vendor?.withholdingCode ?? "",
      role: vendor?.role === "both" ? "both" : "vendor",
      notes: vendor?.notes ?? "",
      isActive: vendor?.isActive ?? true,
    }),
    [vendor, defaultCurrency, defaultCountryCode],
  );

  function handleSubmit(values: VendorFormValues): void {
    const payload: SaveVendorInput = {
      role: values.role,
      displayName: values.displayName.trim(),
      legalName: textOrNull(values.legalName),
      email: textOrNull(values.email),
      phone: textOrNull(values.phone),
      countryCode: values.countryCode.toUpperCase(),
      defaultCurrency: values.defaultCurrency.toUpperCase(),
      billingCity: textOrNull(values.billingCity),
      billingRegion: textOrNull(values.billingRegion),
      defaultExpenseAccountId: textOrNull(values.defaultExpenseAccountId),
      paymentTermsDays: Number(values.paymentTermsDays),
      withholdingCode: textOrNull(values.withholdingCode),
      notes: textOrNull(values.notes),
      isActive: values.isActive,
    };

    if (vendor) {
      updateVendor.mutate(
        { partyId: vendor.id, input: payload },
        {
          onSuccess: () => {
            toast.success("Vendor updated");
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
      return;
    }

    createVendor.mutate(payload, {
      onSuccess: () => {
        toast.success("Vendor added");
        onOpenChange(false);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <EntityFormSheet<VendorFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={vendor ? "Edit vendor" : "Add a vendor"}
      description="Who you buy from, and the defaults their bills should start with."
      resolver={zodResolver(vendorFormSchema)}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={createVendor.isPending || updateVendor.isPending}
      submitLabel={vendor ? "Save vendor" : "Add vendor"}
      resetOnOpen
      className="sm:max-w-lg"
    >
      {(form) => <VendorFormFields form={form} />}
    </EntityFormSheet>
  );
}
