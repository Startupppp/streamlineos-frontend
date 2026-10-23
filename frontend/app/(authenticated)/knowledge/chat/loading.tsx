import { Skeleton } from "@/components/ui/skeleton";

const BUBBLES = [
  "w-2/3",
  "w-3/4",
  "w-1/2",
  "w-3/5",
  "w-2/3",
  "w-1/2",
  "w-3/4",
  "w-2/5",
] as const;

export default function KnowledgeChatLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(4rem,1fr)] gap-4 overflow-hidden p-4">
        {BUBBLES.map((size, index) => (
          <div
            key={index}
            className={index % 2 === 0 ? "flex justify-end" : "flex justify-start"}
          >
            <Skeleton className={`${size} h-full min-h-0 rounded-2xl`} />
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-border p-4">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
