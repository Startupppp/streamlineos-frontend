import { PageWrapper } from "@/components/ui/page-wrapper";
import { ModuleCardSkeleton } from "@/features/settings/modules/modules-page";

export default function ModulesLoading() {
  return (
    <PageWrapper
      title="Module Management"
      subtitle="Enable or disable feature modules for your organization"
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <ModuleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
