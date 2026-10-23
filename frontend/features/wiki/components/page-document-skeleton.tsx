import { Skeleton } from "@/components/ui/skeleton";
import { WIKI_DOCUMENT_COLUMN, WIKI_SPREADSHEET_COLUMN } from "@/features/wiki/lib/wiki-document-column";
import { cn } from "@/lib/utils";

export function PageSpreadsheetSkeleton({ label = "Loading spreadsheet" }: { label?: string }) {
  return (
    <div className={cn("wiki-document flex h-full min-h-0 flex-1 flex-col overflow-hidden", WIKI_SPREADSHEET_COLUMN)} aria-label={label}>
      <div className="wiki-document-chrome shrink-0">
        <div className="flex min-w-0 flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
          <Skeleton className="h-4 w-40 max-w-full" />
          <div className="flex gap-1.5 sm:ml-auto">
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          </div>
        </div>
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center py-2">
          <Skeleton className="h-9 w-full max-w-64" />
        </div>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border">
          <div className="flex h-10 shrink-0 items-center gap-1 overflow-hidden border-b border-border px-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-6 min-w-0 flex-1 rounded-md" />
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
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col gap-4 p-4 sm:gap-6 sm:p-8" aria-label="Loading file">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-3 w-full max-w-sm" />
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
          <Skeleton className="h-8 w-full rounded-md sm:w-28" />
          <Skeleton className="h-8 w-full rounded-md sm:w-24" />
          <Skeleton className="col-span-2 h-8 w-full rounded-md sm:col-auto sm:w-20" />
        </div>
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
        <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col", WIKI_DOCUMENT_COLUMN)}>
          <div className="wiki-document-chrome shrink-0 border-b border-border">
            <div className="flex min-w-0 flex-col gap-2 py-2.5 sm:flex-row sm:items-center">
              <Skeleton className="h-5 w-36 max-w-full" />
              <div className="flex gap-1.5 sm:ml-auto">
                <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
                <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
                <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
                <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto border-t border-border py-2">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-7 w-7 shrink-0 rounded-md" />
              ))}
            </div>
          </div>
          <div className="flex min-h-0 w-full flex-1 flex-col gap-5 overflow-hidden py-2">
            <Skeleton className="h-9 w-3/4 shrink-0" />
            <Skeleton className="h-4 w-40 max-w-full shrink-0" />
            <div className="grid min-h-0 flex-1 auto-rows-[minmax(1rem,1fr)] gap-3 overflow-hidden">
              {Array.from({ length: 48 }, (_, index) => (
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
