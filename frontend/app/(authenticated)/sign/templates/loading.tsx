import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function SignTemplatesLoading() {
  return (
    <PageWrapper title="Templates" subtitle="Reusable envelope layouts you can send again and again">
      <div className="space-y-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </PageWrapper>
  );
}
