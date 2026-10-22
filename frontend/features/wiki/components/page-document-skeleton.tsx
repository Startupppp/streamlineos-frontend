import { Skeleton } from "@/components/ui/skeleton";

const DOCUMENT_COLUMN = "mx-auto w-full min-w-0 max-w-4xl px-4 sm:px-8";

export function PageDocumentSkeleton() {
  return (
    <div className="wiki-document flex h-full min-h-full flex-1 flex-col" aria-label="Loading file">
      <div className="flex min-h-0 min-w-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="wiki-document-chrome shrink-0 border-b border-border">
            <div className={`${DOCUMENT_COLUMN} flex items-center gap-3 py-2.5`}>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="ml-auto h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
            <div className={`${DOCUMENT_COLUMN} flex gap-2 border-t border-border py-2`}>
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-7 w-7 rounded-md" />
              ))}
            </div>
          </div>
          <div className={`${DOCUMENT_COLUMN} flex min-h-0 flex-1 flex-col gap-5 py-4`}>
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
        <div className="hidden w-72 shrink-0 flex-col border-l border-border bg-muted/20 xl:flex">
          <div className="space-y-2 border-b border-border/80 px-4 py-3">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex flex-col gap-3 px-4 py-4">
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="grid grid-cols-[5.5rem_1fr] gap-3">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
