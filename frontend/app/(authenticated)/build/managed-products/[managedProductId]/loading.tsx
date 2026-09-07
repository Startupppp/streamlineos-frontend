import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { PmPageShell } from "@/components/pm-chrome/pm-chrome";

export default function ManagedProductDetailLoading() {
  return (
    <PageWrapper title="Managed Product" backHref="/build/managed-products">
      <PmPageShell>
        <div className="flex max-w-2xl flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
