import { Skeleton } from "@/components/ui/skeleton";
import { WIKI_DOCUMENT_COLUMN } from "@/features/wiki/lib/wiki-document-column";
import { cn } from "@/lib/utils";

export function PageDocumentSkeleton() {
  return (
    <div className="wiki-document flex h-full min-h-0 flex-1 flex-col overflow-hidden" aria-label="Loading file">
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="wiki-document-chrome shrink-0 border-b border-border">
            <div className={cn(WIKI_DOCUMENT_COLUMN, "flex items-center gap-1.5 py-2.5")}>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="ml-auto h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
            <div className={cn(WIKI_DOCUMENT_COLUMN, "flex gap-2 border-t border-border py-2")}>
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-7 w-7 rounded-md" />
              ))}
            </div>
          </div>
          <div className={cn(WIKI_DOCUMENT_COLUMN, "flex min-h-0 flex-1 flex-col gap-5 py-4")}>
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-40" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
