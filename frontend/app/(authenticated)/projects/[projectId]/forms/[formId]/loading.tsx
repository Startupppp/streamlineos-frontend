import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function FormDetailLoading() {
  return (
    <PageWrapper title="Form" backHref="#">
      <PmPageShell>
        <PmSection index={0}>
          <Skeleton className="h-8 w-64 rounded-md" />
        </PmSection>
        <PmSection index={1}>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
