import { Skeleton } from "@/components/ui/skeleton";

export default function WikiPageLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-64 w-full rounded-lg mt-4" />
    </div>
  );
}
