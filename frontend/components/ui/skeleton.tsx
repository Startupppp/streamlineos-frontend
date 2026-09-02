import { cn } from "../../lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "skeleton-shimmer animate-pulse rounded-md bg-muted h-4",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
