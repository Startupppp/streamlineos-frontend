"use client";

import { useRef } from "react";
import { Download } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleDownload} aria-label="Download payslip as PDF">
          <Download className="mr-2 h-4 w-4" />
          Download Payslip
        </Button>
      </div>
      <PayslipPrintView payslip={payslip} containerRef={payslipRef} />
    </div>
  );
}
