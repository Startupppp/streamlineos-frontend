import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { TemplateListSkeleton } from "@/features/sign/templates/template-list-skeleton";

export default function SignTemplatesLoading() {
  return (
    <PageWrapper
      title="Templates"
      subtitle="Reusable envelope layouts you can send again and again"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={<Skeleton className="h-9 w-36 max-w-full rounded-md" />}
    >
      <TemplateListSkeleton />
    </PageWrapper>
  );
}
