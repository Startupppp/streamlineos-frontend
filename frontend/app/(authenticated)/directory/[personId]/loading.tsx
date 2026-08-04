import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function DirectoryPersonLoading() {
  return (
    <PageWrapper title="Person" subtitle="Loading person…" backHref="/directory">
      <div className="space-y-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
