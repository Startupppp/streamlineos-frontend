"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle, Lock, Edit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PAGE_BODY_SKELETON_CLASS } from "@/components/ui/content-fill-panel";
import { ErrorState } from "@/components/shared";
import { EssStatusBadge } from "./ess-status-badge";
import { useEssTaxDeclaration, useSubmitTaxDeclaration } from "@/hooks/api/payroll/ess";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import { cn } from "@/lib/utils";

const taxSchema = z.object({
  regime: z.enum(["OLD", "NEW"]),
  hra: z.string().optional(),
  lta: z.string().optional(),
  section80c: z.string().optional(),
  section80d: z.string().optional(),
  section80g: z.string().optional(),
  homeLoanInterest: z.string().optional(),
});

type TaxFormValues = z.infer<typeof taxSchema>;

function parseOptionalAmount(v: string | undefined): number | undefined {
  if (!v || v.trim() === "") return undefined;
  const n = parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const DECLARATION_FIELDS: { key: keyof Omit<TaxFormValues, "regime">; label: string; max?: number }[] = [
  { key: "section80c", label: "Section 80C (PF, LIC, ELSS…)", max: 150000 },
  { key: "section80d", label: "Section 80D (Medical insurance)" },
  { key: "section80g", label: "Section 80G (Donations)" },
  { key: "hra", label: "HRA (Rent paid per year)" },
  { key: "homeLoanInterest", label: "Home loan interest (Sec 24B)" },
  { key: "lta", label: "LTA" },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface TaxSheetProps {
  open: boolean;
  onClose: () => void;
  financialYear: string;
  currentRegime?: "OLD" | "NEW";
  currentValues?: Record<string, string | null | undefined>;
}

function TaxDeclarationSheet({ open, onClose, financialYear, currentRegime, currentValues }: TaxSheetProps) {
  const mutation = useSubmitTaxDeclaration();
  const form = useForm<TaxFormValues>({
    resolver: zodResolver(taxSchema),
    defaultValues: {
      regime: currentRegime ?? "NEW",
      hra: currentValues?.hra ?? "",
      lta: currentValues?.lta ?? "",
      section80c: currentValues?.section80c ?? "",
      section80d: currentValues?.section80d ?? "",
      section80g: currentValues?.section80g ?? "",
      homeLoanInterest: currentValues?.homeLoanInterest ?? "",
    },
  });

  const handleSubmit = async (values: TaxFormValues) => {
    try {
      await mutation.mutateAsync({
        financialYear,
        regime: values.regime,
        hra: parseOptionalAmount(values.hra),
        lta: parseOptionalAmount(values.lta),
        section80c: parseOptionalAmount(values.section80c),
        section80d: parseOptionalAmount(values.section80d),
        section80g: parseOptionalAmount(values.section80g),
        homeLoanInterest: parseOptionalAmount(values.homeLoanInterest),
      });
      toast.success("Tax declaration submitted");
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
            <SheetTitle>Tax Declaration — {financialYear}</SheetTitle>
          </SheetHeader>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
          <SheetBody className="px-6 py-4 space-y-4">
            <FormField
              control={form.control}
              name="regime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax Regime</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-4 mt-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="NEW" id="regime-new" />
                        <Label htmlFor="regime-new" className="font-normal cursor-pointer">New Regime</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="OLD" id="regime-old" />
                        <Label htmlFor="regime-old" className="font-normal cursor-pointer">Old Regime</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-3">
              {DECLARATION_FIELDS.map(({ key, label, max }) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={key}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        {label}{max ? ` (max ₹${(max / 1000).toFixed(0)}K)` : ""}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0"
                          className="text-sm"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </SheetBody>
          <div className="shrink-0 px-6 py-4 border-t grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <LoadingButton type="submit" isPending={mutation.isPending} loadingText="Saving…">
              Save Declaration
            </LoadingButton>
          </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function TaxSkeleton() {
  return (
    <div className={PAGE_BODY_SKELETON_CLASS}>
      <Skeleton className="h-9 w-full rounded-md" />
      <div className="mt-2 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EssTaxSection({
  hideToolbar = false,
  sheetOpen: sheetOpenProp,
  onSheetOpenChange,
}: {
  hideToolbar?: boolean;
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
}) {
  const { data, isLoading, isError, error, refetch } = useEssTaxDeclaration();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const sheetOpen = sheetOpenProp ?? uncontrolledOpen;
  const setSheetOpen = onSheetOpenChange ?? setUncontrolledOpen;

  const handleOpen = () => setSheetOpen(true);
  const handleClose = () => setSheetOpen(false);

  if (isLoading) {
    return (
      <section id="tax" className="flex min-h-0 w-full flex-1 flex-col">
        <TaxSkeleton />
      </section>
    );
  }

  if (isError) {
    return (
      <section id="tax" className="flex min-h-0 w-full flex-1 flex-col">
        <ErrorState
          description={getErrorMessage(error)}
          onRetry={refetch}
          className="flex-1"
        />
      </section>
    );
  }

  const windowOpen = data?.windowStatus === "OPEN";
  const declaration = data?.declaration;

  return (
    <section id="tax" className="flex min-h-0 w-full flex-1 flex-col gap-3">
      {windowOpen && !hideToolbar ? (
        <div className="flex shrink-0 items-center justify-end gap-3">
          <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={handleOpen}>
            <Edit className="h-3 w-3" />
            {declaration ? "Edit" : "Submit"} Declaration
          </Button>
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="min-h-0 w-full flex-1 overflow-hidden rounded-xl border border-border bg-card"
      >
        <div className={cn(
          "px-4 py-3 flex items-center gap-2 border-b border-border",
          windowOpen ? "bg-emerald-50 dark:bg-emerald-500/10" : "bg-muted/30",
        )}>
          {windowOpen ? (
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-medium", windowOpen ? "text-emerald-800 dark:text-emerald-300" : "text-foreground")}>
              {windowOpen
                ? `Declaration window open — FY ${data?.financialYear}`
                : "Declaration window closed — contact HR to make changes"}
            </p>
            {windowOpen && data?.closesAt && (
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">Closes {formatDate(data.closesAt)}</p>
            )}
          </div>
          {!windowOpen && <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />}
        </div>

        {declaration ? (
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Regime</span>
              <EssStatusBadge status={declaration.regime} />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Status</span>
              <EssStatusBadge status={declaration.status} />
            </div>
            {declaration.status === "DRAFT" && declaration.reviewNote && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-500/10 border-b border-border">
                <p className="text-dense font-semibold text-red-700 dark:text-red-300 mb-0.5">Rejection Reason</p>
                <p className="text-xs text-red-600 dark:text-red-400">{declaration.reviewNote}</p>
              </div>
            )}
            {DECLARATION_FIELDS.map(({ key, label }) => {
              const val = declaration[key as keyof typeof declaration];
              if (!val || val === "0") return null;
              return (
                <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium tabular-nums">{formatMoney(val as string)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">No declaration submitted for FY {data?.financialYear}</p>
            {windowOpen && (
              <Button size="sm" className="mt-3" onClick={handleOpen}>Submit Declaration</Button>
            )}
          </div>
        )}
      </motion.div>

      {windowOpen && data?.financialYear && (
        <TaxDeclarationSheet
          open={sheetOpen}
          onClose={handleClose}
          financialYear={data.financialYear}
          currentRegime={declaration?.regime}
          currentValues={declaration ? {
            hra: declaration.hra,
            lta: declaration.lta,
            section80c: declaration.section80c,
            section80d: declaration.section80d,
            section80g: declaration.section80g,
            homeLoanInterest: declaration.homeLoanInterest,
          } : undefined}
        />
      )}
    </section>
  );
}
