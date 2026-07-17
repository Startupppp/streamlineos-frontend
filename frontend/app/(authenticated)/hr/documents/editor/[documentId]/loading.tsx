import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function DocumentEditorLoading() {
  return (
    <PageWrapper
      title="Document Editor"
      subtitle="Loading..."
      actions={
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      }
    >
      <div className="space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    </PageWrapper>
  );
}
