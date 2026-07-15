import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignReportsLoading() {
  return (
    <PageWrapper title="Reports" subtitle="Envelope activity, completion rates, and usage across SignOS">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </PageWrapper>
  );
}
