import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

const DEVICE_CARDS = [1, 2, 3];

export default function BiometricLoading() {
  return (
    <PageWrapper
      title="Biometric Integration"
      subtitle="Manage fingerprint/face-recognition devices and attendance sync"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="flex gap-1">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DEVICE_CARDS.map((card) => (
            <Skeleton key={card} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
