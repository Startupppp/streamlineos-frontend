import { Skeleton } from "@/components/ui/skeleton";

const BUBBLES = [
  "h-16 w-2/3",
  "h-24 w-3/4",
  "h-14 w-1/2",
  "h-28 w-3/4",
  "h-16 w-2/3",
  "h-20 w-3/5",
] as const;

export default function KnowledgeLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-hidden p-4">
        {BUBBLES.map((size, index) => (
          <div
            key={index}
            className={index % 2 === 0 ? "flex justify-end" : "flex justify-start"}
          >
            <Skeleton className={`${size} rounded-2xl`} />
          </div>
        ))}
      </div>
      <div className="border-t border-border p-4">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
