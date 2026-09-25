"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Paperclip, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { XIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { useSubmitReimbursement } from "@/hooks/api/payroll/ess";
import { useUploadFile } from "@/hooks/api/use-upload-file";
import {
  CLAIM_CATEGORIES,
  MAX_CLAIM_AMOUNT,
  getCurrentMonth,
  reimbursementSchema,
  type ReimbursementFormValues,
} from "./ess-reimbursements-schema";

export function SubmitSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useSubmitReimbursement();
  const uploadFile = useUploadFile();
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);

  const form = useForm<ReimbursementFormValues>({
    resolver: zodResolver(reimbursementSchema),
    defaultValues: { category: "", amount: "", description: "", payrollMonth: getCurrentMonth() },
  });

  function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadFile.mutate(
      { file, folder: "reimbursements" },
      {
        onSuccess: (result) => {
          setReceiptUrl(result.key);
          setReceiptName(file.name);
        },
        onError: () => toast.error("Failed to upload receipt"),
      },
    );
  }

  const { iconRef: removeIconRef, hoverHandlers: removeHoverHandlers } = useAnimatedIcon();

  function handleRemoveReceipt() {
    setReceiptUrl(null);
    setReceiptName(null);
  }

  const handleSubmit = async (values: ReimbursementFormValues) => {
    try {
      await mutation.mutateAsync({
        category: values.category,
        amount: parseFloat(values.amount),
        description: values.description,
        receiptUrl: receiptUrl ?? undefined,
        payrollMonth: values.payrollMonth,
      });
      toast.success("Claim submitted for approval");
      form.reset();
      setReceiptUrl(null);
      setReceiptName(null);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  function handleClose() {
    form.reset({ category: "", amount: "", description: "", payrollMonth: getCurrentMonth() });
    setReceiptUrl(null);
    setReceiptName(null);
    onClose();
  }

  function handleOpenChange(v: boolean) {
    if (!v) handleClose();
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-md">
        <div className="shrink-0 px-6 py-4 border-b">
          <SheetHeader>
            <SheetTitle>Submit Reimbursement</SheetTitle>
          </SheetHeader>
        </div>
        <Form {...form}>
          {/*
            `noValidate` hands validation to the schema. With the browser's own
            constraint validation on, `min="0"` blocked submit before the
            resolver ever ran, so a pasted `-1` sat in the field with a native
            bubble and no inline error under it — the state PAY-004 reports.
          */}
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
            noValidate
          >
          <SheetBody className="px-6 py-4 space-y-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLAIM_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={MAX_CLAIM_AMOUNT}
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                    />
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
                    <Input placeholder="Brief description of the expense" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payrollMonth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Payroll Month <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <MonthPicker value={field.value} onChange={field.onChange} yearRange={[-1, 1]} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Receipt (optional)</p>
              {receiptUrl ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground truncate flex-1">{receiptName}</span>
                  <button
                    type="button"
                    onClick={handleRemoveReceipt}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Remove receipt"
                    {...removeHoverHandlers}
                  >
                    <XIcon ref={removeIconRef} size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed border-border bg-muted/20 px-3 py-2 hover:bg-muted/40 transition-colors">
                  <Upload className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {uploadFile.isPending ? "Uploading…" : "Upload receipt"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,.pdf"
                    disabled={uploadFile.isPending}
                    onChange={handleReceiptChange}
                  />
                </label>
              )}
            </div>
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <LoadingButton type="submit" isPending={mutation.isPending} disabled={mutation.isPending || uploadFile.isPending} loadingText="Submitting…">
              Submit Claim
            </LoadingButton>
          </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
