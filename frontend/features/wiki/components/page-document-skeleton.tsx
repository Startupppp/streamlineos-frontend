import { Skeleton } from "@/components/ui/skeleton";
import { WIKI_DOCUMENT_COLUMN, WIKI_SPREADSHEET_COLUMN } from "@/features/wiki/lib/wiki-document-column";
import { cn } from "@/lib/utils";

export function PageSpreadsheetSkeleton({ label = "Loading spreadsheet" }: { label?: string }) {
  return (
    <div className="wiki-document flex h-full min-h-0 flex-1 flex-col overflow-hidden" aria-label={label}>
      <div className="wiki-document-chrome shrink-0">
        <div className={cn(WIKI_SPREADSHEET_COLUMN, "flex items-center gap-1.5 py-2.5")}>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center px-4 py-2 sm:px-6 lg:px-8">
          <Skeleton className="h-9 w-64 max-w-[70%]" />
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border">
          <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-6 w-14 rounded-md" />
            ))}
          </div>
          <div className="relative min-h-0 flex-1">
            <Skeleton className="absolute inset-0 h-auto w-auto rounded-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageFileSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-6 p-8" aria-label="Loading file">
      <div className="flex shrink-0 flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-72 max-w-full" />
        </div>
        <Skeleton className="h-8 w-28 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <div className="relative min-h-0 flex-1">
        <Skeleton className="absolute inset-0 h-auto w-auto rounded-xl" />
      </div>
    </div>
  );
}

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
          <div className={cn(WIKI_DOCUMENT_COLUMN, "flex min-h-0 flex-1 flex-col gap-5 overflow-hidden py-4")}>
            <Skeleton className="h-9 w-3/4 shrink-0" />
            <Skeleton className="h-4 w-40 shrink-0" />
            <div className="grid min-h-0 flex-1 auto-rows-[minmax(1rem,1fr)] gap-3 overflow-hidden">
              {Array.from({ length: 36 }, (_, index) => (
                <Skeleton
                  key={index}
                  className={index % 6 === 5 ? "h-4 w-2/3" : "h-4 w-full"}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
