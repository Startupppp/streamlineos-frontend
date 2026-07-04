import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-3 gap-4 mt-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
