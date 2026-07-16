import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function SurveysLoading() {
  return (
    <PageWrapper
      title="Surveys"
      subtitle="Build surveys, quizzes, live polls, and lead forms."
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Skeleton className="h-9 w-48 rounded-md" />
          <Skeleton className="h-9 w-[140px] rounded-md" />
          <Skeleton className="h-9 w-[120px] rounded-md" />
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </PageWrapper>
  );
}
