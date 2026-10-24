import { Skeleton } from "@/components/ui/skeleton";

const TEMPLATE_ROW_PLACEHOLDERS = 6;

export function TemplateListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: TEMPLATE_ROW_PLACEHOLDERS }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
        >
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-24 max-w-full" />
          </div>
          <Skeleton className="size-8 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}
