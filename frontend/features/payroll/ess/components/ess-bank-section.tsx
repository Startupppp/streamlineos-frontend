"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Landmark, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEssBank, useUpdateBank } from "@/hooks/api/payroll/ess";
import { cn } from "@/lib/utils";

const bankSchema = z.object({
  accountNumber: z.string().min(6, "Account number too short").max(20),
  confirmAccount: z.string().min(6, "Required"),
  ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC format (e.g. SBIN0001234)"),
  accountHolder: z.string().min(2, "Account holder name required").max(100),
  bankName: z.string().optional(),
  branch: z.string().optional(),
}).refine((d) => d.accountNumber === d.confirmAccount, {
  message: "Account numbers do not match",
  path: ["confirmAccount"],
});

type BankFormValues = z.infer<typeof bankSchema>;

function MaskedField({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2.5 px-4 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium font-mono">{value}</span>
    </div>
  );
}

function RevealInput({ placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { placeholder?: string }) {
  const [show, setShow] = useState(false);
  const handleToggle = () => setShow((v) => !v);
  return (
    <div className="relative">
      <input
        {...props}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          "pr-10",
        )}
      />
      <button
        type="button"
        onClick={handleToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
        aria-label={show ? "Hide" : "Show"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function BankSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const mutation = useUpdateBank();
  const form = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: {
      accountNumber: "",
      confirmAccount: "",
      ifsc: "",
      accountHolder: "",
      bankName: "",
      branch: "",
    },
  });

  const handleSubmit = async (values: BankFormValues) => {
    try {
      await mutation.mutateAsync({
        accountNumber: values.accountNumber,
        ifsc: values.ifsc,
        accountHolder: values.accountHolder,
        bankName: values.bankName,
        branch: values.branch,
      });
      toast.success("Bank details updated");
      form.reset();
      onClose();
    } catch {
      toast.error("Failed to update bank details");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Update Bank Details</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Changes affect your next payroll run and will be verified by HR before processing.
          </p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="accountHolder"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="As per bank records" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <RevealInput placeholder="Enter account number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmAccount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Account Number</FormLabel>
                  <FormControl>
                    <RevealInput placeholder="Re-enter account number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="ifsc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IFSC Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. SBIN0001234" className="uppercase" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. State Bank of India" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branch"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Connaught Place, New Delhi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : "Save Details"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export function EssBankSection() {
  const { data, isLoading } = useEssBank();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleOpen = () => setSheetOpen(true);
  const handleClose = () => setSheetOpen(false);

  return (
    <section id="bank" className="scroll-mt-20">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" />
          Bank Details
        </h2>
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleOpen}>
          Update
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        ) : data?.hasBank && data.masked ? (
          <div className="divide-y divide-border">
            <MaskedField label="Account Number" value={data.masked.accountNumber} />
            <MaskedField label="Account Holder" value={data.masked.accountHolder} />
            <MaskedField label="Bank" value={data.masked.bankName} />
            <MaskedField label="IFSC" value={data.masked.ifsc} />
            <MaskedField label="Branch" value={data.masked.branch} />
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <Landmark className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No bank details on file</p>
            <Button size="sm" className="mt-3" onClick={handleOpen}>Add Bank Details</Button>
          </div>
        )}
      </motion.div>

      <BankSheet open={sheetOpen} onClose={handleClose} />
    </section>
  );
}
