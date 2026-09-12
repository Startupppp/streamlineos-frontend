import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

/**
 * Mirrors the two-pane roles view `ModuleAccessPage` opens on: a tab strip and
 * an audit-log action in the chrome, a narrow group list, and the permission
 * detail beside it. Built from primitives rather than importing the shared
 * module-access internals — that surface belongs to `features/module-access/`
 * and inventory neither owns nor may change its states.
 */
export default function InventoryAccessLoading() {
  return (
    <PageWrapper
      title="Inventory Access"
      subtitle="Manage role groups, members, and permissions for this module."
      actions={<Skeleton className="h-9 w-28" />}
      filtersClassName="justify-between"
      filters={
        <>
          <Skeleton className="h-9 w-full shrink-0 rounded-lg md:w-64" />
          <Skeleton className="ml-auto h-9 w-32 shrink-0" />
        </>
      }
    >
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[300px_1fr]">
        <div className={cn(CONTENT_PANEL_SOLID, "flex min-h-0 flex-col overflow-hidden")}>
          <div className="shrink-0 px-4 py-3">
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>

        <div className={cn(CONTENT_PANEL_SOLID, "flex min-h-0 flex-col gap-2 p-4")}>
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 py-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-56" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
