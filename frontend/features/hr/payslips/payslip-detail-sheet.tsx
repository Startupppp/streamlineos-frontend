"use client";

import { useRef } from "react";
import { Download, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { usePayslipPdf } from "@/features/hr/my-payslips/use-payslip-pdf";
import { PayslipPrintView, type PayslipData } from "./payslip-print-view";

interface PayslipDetailSheetProps {
  payslip: PayslipData | undefined;
}

export function PayslipDetailSheet({ payslip }: PayslipDetailSheetProps) {
  const payslipRef = useRef<HTMLDivElement>(null);
  const { download } = usePayslipPdf();

  if (!payslip) {
    return (
      <EmptyState
        illustration={<EmptyDocumentsIllustration className="h-32 w-32" />}
        title="No payslip found"
        description="No payslip is available for the selected month."
      />
    );
  }

  const handleDownload = () => {
    void download(payslipRef, { month: payslip.month, user: payslip.user });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-foreground">Payslip Document</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            aria-label="Print payslip"
            className="h-8 gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button
            size="sm"
            onClick={handleDownload}
            aria-label="Download payslip as PDF"
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Download className="h-3.5 w-3.5" />
            Download PDF
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
        <PayslipPrintView payslip={payslip} containerRef={payslipRef} />
      </div>
    </div>
  );
}
