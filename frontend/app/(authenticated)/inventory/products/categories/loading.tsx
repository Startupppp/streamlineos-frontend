import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CategoriesLoading() {
  return (
    <PageWrapper title="Categories" subtitle="Organise products into categories and sub-categories.">
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="space-y-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
