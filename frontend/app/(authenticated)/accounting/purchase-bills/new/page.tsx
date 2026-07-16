"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Form } from "@/components/ui/form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import {
  useAccounts,
  useCreatePurchaseBill,
  type CreatePurchaseBillInput,
} from "@/hooks/api/accounting";
import { useClientAccounts } from "@/hooks/api/crm";
import { INDIAN_STATES } from "@/lib/accounting/indian-states";
import {
  newBillSchema,
  todayIso,
  num,
  computeTotals,
} from "@/features/accounting/purchases/bill-form-schemas";
import type { NewBillFormValues } from "@/features/accounting/purchases/bill-form-schemas";
import { BillNewFormBody } from "@/features/accounting/purchases/bill-new-form-body";

export default function NewPurchaseBillPage() {
  const router = useRouter();
  const clientsQuery = useClientAccounts({});
  const accountsQuery = useAccounts({
    page: 1,
    pageSize: 500,
    activeOnly: true,
    type: "EXPENSE",
  });
  const createMutation = useCreatePurchaseBill();

  const [confirmPostOpen, setConfirmPostOpen] = useState<boolean>(false);

  const form = useForm<NewBillFormValues>({
    resolver: zodResolver(newBillSchema),
    defaultValues: {
      vendorId: "",
      vendorBillNumber: "",
      billDate: todayIso(),
      dueDate: "",
      status: "DRAFT",
      placeOfSupply: "",
      vendorGstin: "",
      supplierGstin: "",
      reverseCharge: false,
      discount: "0",
      notes: "",
      expenseAccountCode: "5990",
      items: [
        {
          description: "",
          hsnSacCode: "",
          quantity: "1",
          rate: "0",
          gstRate: "18",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedSupplierGstin = form.watch("supplierGstin");
  const watchedPlaceOfSupply = form.watch("placeOfSupply");
  const watchedDiscount = form.watch("discount");
  const watchedStatus = form.watch("status");

  const computed = useMemo(
    () =>
      computeTotals(
        watchedItems,
        watchedSupplierGstin,
        watchedPlaceOfSupply,
        watchedDiscount,
      ),
    [watchedItems, watchedSupplierGstin, watchedPlaceOfSupply, watchedDiscount],
  );

  function handleVendorChange(value: string): void {
    form.setValue("vendorId", value, { shouldValidate: true });
    const accounts = clientsQuery.data?.accounts ?? [];
    const vendor = accounts.find((c) => String(c.id) === value);
    if (vendor) {
      const gstin = (vendor as { gstin?: string | null }).gstin ?? null;
      const state = (vendor as { state?: string | null }).state ?? null;
      if (gstin && !form.getValues("vendorGstin")) {
        form.setValue("vendorGstin", gstin);
      }
      if (state && !form.getValues("placeOfSupply")) {
        const match = INDIAN_STATES.find(
          (s) => s.stateName.toLowerCase() === state.toLowerCase(),
        );
        if (match) form.setValue("placeOfSupply", match.stateCode);
      }
    }
  }

  function handleVendorGstinChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ): void {
    form.setValue("vendorGstin", e.target.value.toUpperCase(), {
      shouldValidate: true,
    });
  }

  function handleSupplierGstinChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ): void {
    form.setValue("supplierGstin", e.target.value.toUpperCase(), {
      shouldValidate: true,
    });
  }

  function handleReverseChargeChange(checked: boolean | "indeterminate"): void {
    form.setValue("reverseCharge", checked === true);
  }

  function handleAddItem(): void {
    append({
      description: "",
      hsnSacCode: "",
      quantity: "1",
      rate: "0",
      gstRate: "18",
    });
  }

  function handleRemoveItemAt(index: number): () => void {
    return (): void => {
      if (fields.length > 1) remove(index);
    };
  }

  function handleCancel(): void {
    router.push("/accounting/purchase-bills");
  }

  function handleConfirmPost(): void {
    setConfirmPostOpen(false);
    void performCreate(form.getValues());
  }

  async function performCreate(values: NewBillFormValues): Promise<void> {
    const validItems = values.items.filter(
      (it) =>
        it.description.trim().length > 0 &&
        num(it.quantity) > 0 &&
        num(it.rate) >= 0,
    );
    const payload: CreatePurchaseBillInput = {
      vendorId: Number(values.vendorId),
      vendorBillNumber: values.vendorBillNumber.trim() || undefined,
      billDate: values.billDate,
      dueDate: values.dueDate || undefined,
      status: values.status,
      placeOfSupply: values.placeOfSupply || undefined,
      vendorGstin: values.vendorGstin.trim() || undefined,
      supplierGstin: values.supplierGstin.trim() || undefined,
      reverseCharge: values.reverseCharge,
      discount: num(values.discount),
      notes: values.notes.trim() || undefined,
      expenseAccountCode: values.expenseAccountCode,
      items: validItems.map((it) => ({
        description: it.description.trim(),
        hsnSacCode: it.hsnSacCode.trim() || undefined,
        quantity: num(it.quantity),
        rate: num(it.rate),
        gstRate: num(it.gstRate),
      })),
    };

    try {
      const result = await createMutation.mutateAsync(payload);
      toast.success(`Bill ${result.billNumber} created`);
      router.push(`/accounting/purchase-bills/${result.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function onSubmit(values: NewBillFormValues): void {
    if (values.status === "POSTED") {
      setConfirmPostOpen(true);
      return;
    }
    void performCreate(values);
  }

  if (clientsQuery.isLoading || accountsQuery.isLoading) {
    return <LoadingState variant="form" />;
  }
  if (clientsQuery.error) {
    return <ErrorState description={getErrorMessage(clientsQuery.error)} />;
  }
  if (accountsQuery.error) {
    return <ErrorState description={getErrorMessage(accountsQuery.error)} />;
  }

  const vendors = clientsQuery.data?.accounts ?? [];
  const expenseAccounts = accountsQuery.data?.items ?? [];

  return (
    <PageWrapper
      title="New purchase bill"
      subtitle="Record a vendor bill. Posting credits AP and debits the chosen expense account + Input GST."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <BillNewFormBody
            fields={fields}
            vendors={vendors}
            expenseAccounts={expenseAccounts}
            computed={computed}
            watchedItems={watchedItems}
            watchedDiscount={watchedDiscount}
            watchedStatus={watchedStatus}
            isPending={createMutation.isPending}
            onVendorChange={handleVendorChange}
            onVendorGstinChange={handleVendorGstinChange}
            onSupplierGstinChange={handleSupplierGstinChange}
            onReverseChargeChange={handleReverseChargeChange}
            onAddItem={handleAddItem}
            onRemoveItemAt={handleRemoveItemAt}
            onCancel={handleCancel}
          />
        </form>
      </Form>

      <ConfirmDialog
        open={confirmPostOpen}
        onOpenChange={setConfirmPostOpen}
        title="Post this bill immediately?"
        description="Posting records journal entries (AP, expense, and Input GST) and locks the bill. This cannot be undone. Continue?"
        confirmLabel="Create and post"
        isPending={createMutation.isPending}
        onConfirm={handleConfirmPost}
      />
    </PageWrapper>
  );
}