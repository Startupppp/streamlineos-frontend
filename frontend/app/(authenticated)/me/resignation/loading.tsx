import { MyResignationSkeleton } from "@/features/me/resignation/my-resignation-page";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function MyResignationLoading() {
  return (
    <PageWrapper
      title="Resignation"
      subtitle="Submit, follow and withdraw your resignation"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <MyResignationSkeleton />
    </PageWrapper>
  );
}
