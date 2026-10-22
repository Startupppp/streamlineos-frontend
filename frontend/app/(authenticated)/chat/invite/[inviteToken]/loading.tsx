import { Skeleton } from "@/components/ui/skeleton";

export default function ChatInviteLoading() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background px-4">
      <Skeleton className="h-14 w-14 rounded-2xl" />
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-5 w-48 rounded-md" />
        <Skeleton className="h-4 w-64 rounded-md" />
      </div>
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
  );
}
