import { Skeleton } from "@/components/ui/skeleton";
import { WIZARD_COL_PAD } from "@/components/wizard-shell/constants";

export function OrgSetupLoading() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden md:flex-row" aria-label="Loading organization setup">
      <div className={`flex h-full min-h-0 w-full min-w-0 flex-1 flex-col md:w-1/2 ${WIZARD_COL_PAD}`}>
        <div className="mb-2 space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-hidden">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
      <aside className={`hidden h-full w-1/2 shrink-0 flex-col gap-5 border-l border-border/60 md:flex ${WIZARD_COL_PAD}`}>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
        <div className="flex-1 rounded-2xl border border-border/60 p-5">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-6 h-28 w-full" />
          <Skeleton className="mt-4 h-28 w-full" />
        </div>
      </aside>
    </div>
  );
}
