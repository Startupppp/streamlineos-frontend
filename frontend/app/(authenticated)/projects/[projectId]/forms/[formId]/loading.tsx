import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function FormDetailLoading() {
  return (
    <PageWrapper title="Form">
      <div className="px-4 pb-4 space-y-4">
        <Skeleton className="h-8 w-64 rounded-md" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
