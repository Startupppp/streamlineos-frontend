import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function BankTransfersLoading() {
  return (
    <PageWrapper
      title="Bank Transfers"
      subtitle="Manage NEFT/RTGS payroll disbursement runs"
    >
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="flex items-center gap-4">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-28 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
