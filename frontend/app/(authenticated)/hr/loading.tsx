import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

const QUICK_ACTIONS = [1, 2, 3, 4, 5];
const QUEUE_CARDS = [1, 2, 3, 4];
const METRIC_CARDS = [1, 2, 3, 4, 5, 6];

export default function HrLoading() {
  return (
    <PageWrapper
      title="HR"
      subtitle="People operations hub — manage your team, track time, and run the full employee lifecycle"
      variant="display"
    >
      <div className="flex flex-1 min-h-0 flex-col gap-4">
        <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
          {QUICK_ACTIONS.map((action) => (
            <Skeleton key={action} className="h-20 rounded-xl" />
          ))}
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {QUEUE_CARDS.map((card) => (
              <Skeleton key={card} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {QUEUE_CARDS.map((card) => (
              <Skeleton key={card} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {METRIC_CARDS.map((card) => (
            <Skeleton key={card} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
