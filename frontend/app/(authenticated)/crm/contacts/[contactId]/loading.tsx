import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ContactDetailLoading() {
  return (
    <PageWrapper title="Contact" backHref="/crm/contacts">
      <div className="flex flex-col gap-gap-toolbar">
        <Skeleton className="h-56 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-gap-toolbar">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
          <div className="flex flex-col gap-gap-toolbar lg:col-span-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
