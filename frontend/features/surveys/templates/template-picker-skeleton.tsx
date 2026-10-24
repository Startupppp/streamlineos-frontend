import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const TEMPLATE_CARD_PLACEHOLDERS = 4;

function TemplateCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0">
        <Skeleton className="size-9 shrink-0 rounded-lg" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </CardContent>
    </Card>
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
