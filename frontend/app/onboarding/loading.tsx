import { Skeleton } from "@/components/ui/skeleton";

export default function OnboardingLoading() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden">
      <div className="mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col gap-4 px-4 py-6 sm:px-8 md:max-w-none md:w-1/2 md:px-8">
        <Skeleton className="h-8 w-full md:hidden" />
        <Skeleton className="hidden h-6 w-48 md:block" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
      <div className="hidden h-full w-1/2 shrink-0 flex-col gap-6 border-l border-border/60 p-8 md:flex lg:p-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="mt-4 h-72 w-full max-w-[440px] rounded-2xl" />
      </div>
    </div>
  );
}
