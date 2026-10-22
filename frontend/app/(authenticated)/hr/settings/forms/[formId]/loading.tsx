import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function FormBuilderLoading() {
  return (
    <PageWrapper
      title="Form builder"
      subtitle="Configure form fields and settings"
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
