"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { PAGE_BODY_EMPTY_CLASS, PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { useEssBank, useUpdateBank } from "@/hooks/api/payroll/ess";
import type { EssBankDetails } from "@/hooks/api/payroll/ess-schema";
import { cn } from "@/lib/utils";
import { codeFieldChange } from "@/lib/code-field";

type BankScheme = "IFSC" | "ABA_ROUTING" | "SORT_CODE" | "IBAN" | "BSB" | "SWIFT_ACCOUNT" | "GENERIC";

const COUNTRY_SCHEME: Record<string, BankScheme> = {
  IN: "IFSC",
  US: "ABA_ROUTING",
  GB: "SORT_CODE",
  AU: "BSB",
  AE: "IBAN",
  SG: "SWIFT_ACCOUNT",
};

const IFSC_LENGTH = 11;

function detectScheme(country: string): BankScheme {
  return COUNTRY_SCHEME[country] ?? "GENERIC";
}

type SchemeConfig = { label: string; placeholder: string; regex?: RegExp; hint: string };

const SCHEME_CONFIG: Record<BankScheme, SchemeConfig> = {
  IFSC: { label: "IFSC Code", placeholder: "e.g. SBIN0001234", regex: /^[A-Z]{4}0[A-Z0-9]{6}$/, hint: "11 chars: 4 letters + 0 + 6 alphanumeric" },
  ABA_ROUTING: { label: "Routing Number (ABA)", placeholder: "e.g. 021000021", regex: /^\d{9}$/, hint: "9-digit ABA routing number" },
  SORT_CODE: { label: "Sort Code", placeholder: "e.g. 200000", regex: /^\d{6}$/, hint: "6 digits, no dashes" },
  IBAN: { label: "IBAN", placeholder: "e.g. AE070331234567890123456", hint: "Up to 34 alphanumeric characters" },
  BSB: { label: "BSB Number", placeholder: "e.g. 062000", regex: /^\d{6}$/, hint: "6-digit Australian BSB" },
  SWIFT_ACCOUNT: { label: "SWIFT / BIC", placeholder: "e.g. DBSSSGSG", regex: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, hint: "8 or 11 character SWIFT code" },
  GENERIC: { label: "Bank Code", placeholder: "Enter bank code", hint: "4–34 alphanumeric characters" },
};

const BANK_COUNTRIES: { value: string; label: string }[] = [
  { value: "IN", label: "India (IFSC)" },
  { value: "US", label: "United States (ABA)" },
  { value: "GB", label: "United Kingdom (Sort Code)" },
  { value: "AU", label: "Australia (BSB)" },
  { value: "AE", label: "UAE (IBAN)" },
  { value: "SG", label: "Singapore (SWIFT)" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "NL", label: "Netherlands" },
  { value: "CA", label: "Canada" },
  { value: "NZ", label: "New Zealand" },
];

const bankSchema = z.object({
  bankCountry: z.string().min(2).max(2),
  accountNumber: z.string().min(6, "Account number too short").max(34),
  confirmAccount: z.string().min(6, "Required"),
  code: z.string().min(1, "Bank code is required"),
  accountHolder: z.string().trim().min(2, "Account holder name must be at least 2 characters").max(100)
    .refine((v) => /[A-Za-z]/.test(v), "Account holder name must contain letters and match the bank account name.")
    .refine((v) => /^[A-Za-z\s'.,-]+$/.test(v), "Account holder name can only contain letters, spaces, hyphens, apostrophes, and periods"),
  bankName: z.string().optional(),
  branch: z.string().optional(),
}).refine((d) => d.accountNumber === d.confirmAccount, {
  message: "Account numbers do not match",
  path: ["confirmAccount"],
}).superRefine((d, ctx) => {
  const schemeConf = SCHEME_CONFIG[detectScheme(d.bankCountry)];
  if (schemeConf.regex && !schemeConf.regex.test(d.code)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid ${schemeConf.label} format. ${schemeConf.hint}`,
      path: ["code"],
    });
  }
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

type MaskedBank = Extract<EssBankDetails, { hasBank: true }>["masked"];

function seedFromMasked(masked: MaskedBank | null | undefined): BankFormValues {
  return {
    bankCountry: masked?.bankCountry ?? "IN",
    accountNumber: "",
    confirmAccount: "",
    code: masked?.ifsc ?? "",
    accountHolder: masked?.accountHolder ?? "",
    bankName: masked?.bankName ?? "",
    branch: masked?.branch ?? "",
  };
}

function BankSheet({
  open,
  onClose,
  masked,
}: {
  open: boolean;
  onClose: () => void;
  masked: MaskedBank | null | undefined;
}) {
  const mutation = useUpdateBank();
  const form = useForm<BankFormValues>({
    resolver: zodResolver(bankSchema),
    defaultValues: seedFromMasked(masked),
  });

  useEffect(() => {
    if (open) form.reset(seedFromMasked(masked));
  }, [open, masked, form]);

  const watchedCountry = form.watch("bankCountry");
  const scheme = detectScheme(watchedCountry);
  const schemeConf = SCHEME_CONFIG[scheme];

  /**
   * An IFSC is uppercase alphanumeric; every other scheme's code is taken as
   * typed. Normalising rather than merely upper-casing is what makes a code
   * pasted from a bank statement — spaces and hyphens included — land as a
   * valid one instead of as an invalid string the resolver then rejects.
   */
  function makeBankCodeChange(
    onChange: (value: string) => void,
  ): (event: ChangeEvent<HTMLInputElement>) => void {
    if (scheme === "IFSC") return codeFieldChange(onChange, IFSC_LENGTH);
    return function handleBankCodeChange(event) {
      onChange(event.target.value);
    };
  }

  const handleSubmit = async (values: BankFormValues) => {
    try {
      await mutation.mutateAsync({
        accountNumber: values.accountNumber,
        code: values.code,
        accountHolder: values.accountHolder,
        bankName: values.bankName || undefined,
        branch: values.branch || undefined,
        bankCountry: values.bankCountry,
      });
      toast.success("Bank details updated");
      form.reset(values);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="p-0 flex flex-col gap-0 sm:max-w-md">
        <div className="shrink-0 px-6 py-4 border-b">
          <SheetHeader>
            <SheetTitle>Update Bank Details</SheetTitle>
          </SheetHeader>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
          <SheetBody className="px-6 py-4 space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-status-warning-rule bg-status-warning-surface px-3 py-2.5">
              <AlertTriangle className="h-4 w-4 text-status-warning-ink shrink-0 mt-0.5" />
              <p className="text-xs text-status-warning-ink">
                Changes affect your next payroll run and will be verified by HR before processing.
              </p>
            </div>
            <FormField
              control={form.control}
              name="bankCountry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Country</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BANK_COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  {masked ? (
                    <FormDescription>
                      Stored as {masked.accountNumber} — re-enter it in full to confirm or change it.
                    </FormDescription>
                  ) : null}
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{schemeConf.label}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={schemeConf.placeholder}
                      className={scheme === "IFSC" ? "uppercase" : ""}
                      {...field}
                      onChange={makeBankCodeChange(field.onChange)}
                    />
                  </FormControl>
                  <p className="text-dense text-muted-foreground mt-1">{schemeConf.hint}</p>
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
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <LoadingButton type="submit" isPending={mutation.isPending} loadingText="Saving…">
              Save Details
            </LoadingButton>
          </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export function EssBankSection({
  hideToolbar = false,
  sheetOpen: sheetOpenProp,
  onSheetOpenChange,
}: {
  hideToolbar?: boolean;
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
}) {
  const { data, isLoading, isError, error, refetch } = useEssBank();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const sheetOpen = sheetOpenProp ?? uncontrolledOpen;
  const setSheetOpen = onSheetOpenChange ?? setUncontrolledOpen;

  const handleOpen = () => setSheetOpen(true);
  const handleClose = () => setSheetOpen(false);

  return (
    <section id="bank" className="flex min-h-0 w-full flex-1 flex-col gap-3">
      {!hideToolbar ? (
        <div className="flex shrink-0 items-center justify-end gap-3">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleOpen}>
            Update
          </Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className={PAGE_BODY_SKELETON_CLASS}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-32" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          title="Couldn't load bank details"
          description={getErrorMessage(error)}
          onRetry={() => void refetch()}
        />
      ) : data?.hasBank && data.masked ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="divide-y divide-border">
            <MaskedField label="Account Number" value={data.masked.accountNumber} />
            <MaskedField label="Account Holder" value={data.masked.accountHolder} />
            <MaskedField label="Bank" value={data.masked.bankName ?? null} />
            <MaskedField label="Bank Country" value={data.masked.bankCountry ?? null} />
            <MaskedField label="IFSC" value={data.masked.ifsc ?? null} />
            <MaskedField label="Branch" value={data.masked.branch ?? null} />
          </div>
        </motion.div>
      ) : (
        <EmptyState
          illustrationPreset="payroll"
          title="No bank details on file"
          description="Add your bank account so payroll can deposit your salary."
          action={{ label: "Add Bank Details", onClick: handleOpen }}
          className={PAGE_BODY_EMPTY_CLASS}
        />
      )}

      <BankSheet open={sheetOpen} onClose={handleClose} masked={data?.hasBank ? data.masked : null} />
    </section>
  );
}
