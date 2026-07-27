import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { FormBuilderTabSkeleton } from "@/features/build/forms/components/form-builder-tab";

export default function FormDetailLoading() {
  return (
    <PageWrapper title="Form" backHref="#">
      <div className="space-y-4 pt-2">
        <Skeleton className="h-8 w-64 rounded-md" />
        <FormBuilderTabSkeleton />
      </div>
    </PageWrapper>
  );
}
