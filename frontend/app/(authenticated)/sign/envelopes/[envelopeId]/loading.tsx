import { Skeleton } from "@/components/ui/skeleton";

export default function SignEnvelopeBuilderLoading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
