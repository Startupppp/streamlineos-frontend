import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function KitsLoading() {
  return (
    <PageWrapper title="Kits" subtitle="What a kit is made of, and building one from its components">
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </PageWrapper>
  );
}
