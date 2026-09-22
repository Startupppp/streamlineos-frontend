import { Skeleton } from "@/components/ui/skeleton";

export default function AccessDeniedLoading() {
  return (
    <div className="flex flex-1 min-h-0 flex-col items-center justify-center py-12 px-6">
      <Skeleton className="h-12 w-12 rounded-lg mb-4" />
      <Skeleton className="h-5 w-48 mb-2" />
      <Skeleton className="h-4 w-72 mb-1" />
      <Skeleton className="h-4 w-60 mb-5" />
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
  );
}
