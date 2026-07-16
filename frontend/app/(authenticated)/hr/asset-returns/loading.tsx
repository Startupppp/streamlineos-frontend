import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function AssetReturnsLoading() {
  return (
    <PageWrapper
      title="Asset Returns"
      subtitle="Track and manage company asset returns from employees"
      actions={<Skeleton className="h-9 w-[130px] rounded-md" />}
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 px-6 py-3 border-b bg-muted/30">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24 ml-auto" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 border-b last:border-b-0">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
