import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function HrCalendarLoading() {
  return (
    <PageWrapper title="HR Calendar" subtitle="Holidays, leaves, reviews, training, and more in one view">
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-md" />
        ))}
      </div>
    </PageWrapper>
  );
}
