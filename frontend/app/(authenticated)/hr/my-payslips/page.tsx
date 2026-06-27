"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useHrEmployeePayslips } from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download, FileText, TrendingUp, Calendar } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { PayslipDetailSheet } from "@/features/hr/payslips/payslip-detail-sheet";
import { format, parseISO, getYear } from "date-fns";
import { getColorSafe, payrollStatusColors } from "@/lib/theme-constants";
import type { EmployeePayslip } from "@/types/hr";
import { cn } from "@/lib/utils";

const CURRENT_YEAR = getYear(new Date());
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - i));

function PayslipCard({
  payslip,
  onView,
}: {
  payslip: EmployeePayslip;
  onView: (month: string) => void;
}) {
  const monthLabel = format(parseISO(payslip.month + "-01"), "MMMM yyyy");
  const netSalary = parseFloat(payslip.netSalary || "0");
  const grossSalary = parseFloat(payslip.grossSalary || "0");
  const status = payslip.status ?? "DRAFT";

  const handleCardClick = () => onView(payslip.month);
  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onView(payslip.month);
  };

  const accentColor =
    status === "PAID"
      ? "border-l-emerald-500"
      : status === "APPROVED"
        ? "border-l-blue-500"
        : "border-l-slate-400";

  return (
    <button
      type="button"
      onClick={handleCardClick}
      className={cn(
        "w-full text-left rounded-2xl border border-border bg-card shadow-sm overflow-hidden",
        "border-l-4 transition-all duration-200",
        "hover:shadow-md hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        accentColor,
      )}
      aria-label={`View payslip for ${monthLabel}`}
    >
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{monthLabel}</p>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Pay Period
              </p>
            </div>
          </div>
          <div
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
              getColorSafe(payrollStatusColors, status),
            )}
          >
            {status === "PAID" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
            {status}
          </div>
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Net Pay
            </p>
            <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 leading-none">
              ₹{netSalary.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
              Gross
            </p>
            <p className="text-sm font-semibold tabular-nums text-foreground/70">
              ₹{grossSalary.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between bg-muted/20">
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          <span>View payslip</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadClick}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground transition-colors duration-200"
          aria-label={`Download payslip for ${monthLabel}`}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </button>
  );
}

function PayslipPageSkeleton() {
  return (
    <PageWrapper title="My Payslips" subtitle="View and download your salary slips">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-4 pt-3.5 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-7 w-32" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-8 w-28" />
              </div>
              <div className="border-t border-border/50 px-4 py-2">
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}

export default function MyPayslipsPage() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("all");

  const { data: payslips, isLoading } = useHrEmployeePayslips({});

  const selectedPayslip = useMemo(
    () => payslips?.find((p) => p.month === selectedMonth),
    [payslips, selectedMonth],
  );

  const filteredPayslips = useMemo(() => {
    if (!payslips) return [];
    if (selectedYear === "all") return payslips;
    return payslips.filter((p) => p.month.startsWith(selectedYear));
  }, [payslips, selectedYear]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleViewPayslip = useCallback((month: string) => {
    setSelectedMonth(month);
    setSheetOpen(true);
  }, []);

  const handleSheetChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setSelectedMonth("");
  }, []);

  const handleYearChange = useCallback((value: string) => {
    setSelectedYear(value);
  }, []);

  if (isLoading) {
    return <PayslipPageSkeleton />;
  }

  return (
    <PageWrapper
      title="My Payslips"
      subtitle="View and download your salary slips"
      badge={payslips?.length ? payslips.length : undefined}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      }
    >
      {(payslips?.length ?? 0) === 0 ? (
        <EmptyState
          illustration={<EmptyDocumentsIllustration className="h-32 w-32" />}
          title="No payslips yet"
          description="Your payslips will appear here once they have been generated by HR."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {filteredPayslips.length} payslip{filteredPayslips.length !== 1 ? "s" : ""}
              </span>
            </div>
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue placeholder="All years" />
              </SelectTrigger>
              <SelectContent className="w-[var(--radix-select-trigger-width)]">
                <SelectItem value="all">All Years</SelectItem>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredPayslips.length === 0 ? (
            <EmptyState
              illustration={<EmptyDocumentsIllustration className="h-24 w-24" />}
              title={`No payslips for ${selectedYear}`}
              description="Try selecting a different year."
              compact
            />
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPayslips.map((payslip) => (
                <PayslipCard
                  key={payslip.id}
                  payslip={payslip}
                  onView={handleViewPayslip}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={handleSheetChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 gap-0">
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <SheetTitle className="text-base">
              {selectedMonth
                ? format(parseISO(selectedMonth + "-01"), "MMMM yyyy")
                : "Payslip"}
            </SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <PayslipDetailSheet payslip={selectedPayslip} />
          </div>
        </SheetContent>
      </Sheet>
    </PageWrapper>
  );
}
