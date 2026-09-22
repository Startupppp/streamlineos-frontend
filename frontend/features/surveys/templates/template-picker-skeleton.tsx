import { Skeleton } from "@/components/ui/skeleton";

const TEMPLATE_CARD_PLACEHOLDERS = 4;

export function TemplatePickerSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: TEMPLATE_CARD_PLACEHOLDERS }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
