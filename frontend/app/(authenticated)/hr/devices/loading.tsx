import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function DevicesLoading() {
  return (
    <PageWrapper
      title="Time Clock Devices"
      subtitle="Manage biometric, RFID, and mobile time clock devices"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <Skeleton className="h-9 w-64 rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
