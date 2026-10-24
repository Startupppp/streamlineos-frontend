import { Skeleton } from "@/components/ui/skeleton";

const TEMPLATE_CARD_PLACEHOLDERS = 4;

function TemplateCardSkeleton() {
  return (
    <div className="flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3">
      <Skeleton className="size-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function TemplatePickerSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: TEMPLATE_CARD_PLACEHOLDERS }).map((_, index) => (
            <TemplateCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
