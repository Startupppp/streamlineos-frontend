"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useHrEmployeePayslips } from "@/lib/api/hooks/hr";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowLeft } from "lucide-react";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import { RecentPayslipsList } from "@/features/hr/my-payslips/recent-payslips-list";
import { PayslipList } from "@/features/hr/payslips/payslip-list";
import { PayslipDetailSheet } from "@/features/hr/payslips/payslip-detail-sheet";

export default function MyPayslipsPage() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  const { data: payslips, isLoading } = useHrEmployeePayslips({});

  const selectedPayslip = payslips?.find((p) => p.month === selectedMonth);

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <PageWrapper title="My Payslips" subtitle="View and download your salary slips">
        <div className="space-y-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-[500px] rounded-xl max-w-3xl mx-auto" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="My Payslips"
      subtitle="View and download your salary slips"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <PayslipList
            payslips={payslips ?? []}
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </div>
      }
    >
      {!selectedMonth ? (
        <EmptyState
          illustration={<EmptyDocumentsIllustration className="h-32 w-32" />}
          title="Select a month"
          description="Pick a month from the dropdown above to view your payslip."
        />
      ) : (
        <PayslipDetailSheet payslip={selectedPayslip} />
      )}

      {payslips && payslips.length > 0 && !selectedMonth && (
        <div className="mt-4">
          <RecentPayslipsList payslips={payslips} onSelect={setSelectedMonth} />
        </div>
      )}
    </PageWrapper>
  );
}
