import { Skeleton } from "@/components/ui/skeleton";

/** Geometry match for ModuleAccessPage tabs + member/role rows (FE-142). */
export function ModuleAccessSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-1 border-b">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-9 w-24 rounded-none" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
