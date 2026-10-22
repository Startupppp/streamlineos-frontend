import { Skeleton } from "@/components/ui/skeleton";

export function ProjectWebhooksSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 2 }, (_, index) => (
        <Skeleton key={index} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
