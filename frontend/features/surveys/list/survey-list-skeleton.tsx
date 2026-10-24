import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

const SURVEY_CARD_PLACEHOLDERS = 6;

function SurveyCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="has-data-[slot=card-action]:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
        <CardAction>
          <Skeleton className="h-5 w-14 rounded-full" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-4 w-40" />
        <div className="mt-auto flex items-center gap-3">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-36" />
        </div>
      </CardContent>
      <CardFooter className="mt-auto gap-2 border-t border-border/60">
        <Skeleton className="h-9 w-[5.125rem] rounded-md" />
        <Skeleton className="h-9 w-[5.25rem] rounded-md" />
        <Skeleton className="ml-auto h-9 w-[5.95rem] rounded-md" />
        <Skeleton className="size-9 rounded-md" />
      </CardFooter>
    </Card>
  );
}

export function SurveyListSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: SURVEY_CARD_PLACEHOLDERS }).map((_, index) => (
        <SurveyCardSkeleton key={index} />
      ))}
    </div>
  );
}
