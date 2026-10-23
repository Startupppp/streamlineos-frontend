import { Skeleton } from "@/components/ui/skeleton";

export const WIKI_LOADING_CONTENT_CLASS =
  "flex min-h-0 flex-1 flex-col overflow-hidden";

export const WIKI_PAGE_TABLE_HEADERS = [
  "Title",
  "Status",
  "Trust",
  "Owner",
  "Updated",
  "",
] as const;

function wikiTableColumns(headers: readonly string[]) {
  return headers
    .map((header, index) => {
      if (header === "") return "2.75rem";
      if (index === 0) return "minmax(0, 2.2fr)";
      return "minmax(0, 1fr)";
    })
    .join(" ");
}

const WIKI_FILL_CARD_COUNT = 16;

export function WikiFillTable({ headers }: { headers: readonly string[] }) {
  const columns = headers.length;
  const template = wikiTableColumns(headers);
  return (
    <div
      className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card"
      data-testid="loading-skeleton"
    >
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(4.25rem,1fr)] overflow-hidden md:hidden">
        {Array.from({ length: WIKI_FILL_CARD_COUNT }, (_, index) => (
          <div key={index} className="flex min-h-0 flex-col justify-center gap-2 border-b border-border/50 px-3">
            <Skeleton className="h-4 w-2/3 max-w-full" />
            <div className="flex min-w-0 gap-2">
              <Skeleton className="h-3 w-16 max-w-[40%]" />
              <Skeleton className="h-3 w-24 max-w-[45%]" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex">
        <div
          className="grid shrink-0 border-b border-border bg-muted/50"
          style={{ gridTemplateColumns: template }}
        >
          {headers.map((header, index) => (
            <div
              key={`${header}-${index}`}
              className="truncate px-3 py-2 text-xs font-medium text-muted-foreground"
            >
              {header === "" ? <Skeleton className="h-3.5 w-6" /> : header}
            </div>
          ))}
        </div>
        <div
          className="grid min-h-0 min-w-0 flex-1 auto-rows-[minmax(2.5rem,1fr)] overflow-hidden"
          style={{ gridTemplateColumns: template }}
        >
          {Array.from({ length: columns * 32 }, (_, index) => (
            <div key={index} className="flex min-w-0 items-center border-b border-border/50 px-3">
              <Skeleton className={index % columns === 0 ? "h-3.5 w-3/4 max-w-full" : "h-3.5 w-1/2 max-w-full"} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WikiActionsSkeleton({ count = 1 }: { count?: number }) {
  const shared =
    count === 1
      ? "h-9 w-full rounded-md sm:w-28"
      : "h-9 min-w-0 flex-1 basis-[calc(50%-0.25rem)] rounded-md sm:w-28 sm:flex-none sm:basis-auto";
  return (
    <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={shared} />
      ))}
    </div>
  );
}

export function WikiTableRowsSkeleton({
  headers = WIKI_PAGE_TABLE_HEADERS,
}: {
  headers?: readonly string[];
} = {}) {
  return <WikiFillTable headers={headers} />;
}

export function WikiTemplatesGridSkeleton() {
  return (
    <div className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:minmax(4.75rem,1fr)]">
      {Array.from({ length: 42 }, (_, index) => (
        <div
          key={index}
          className="flex h-full min-h-0 items-start gap-3 rounded-lg border border-border bg-card p-3"
        >
          <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-12 shrink-0 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function WikiPageCardsSkeleton() {
  return (
    <div className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:minmax(7.5rem,1fr)]">
      {Array.from({ length: 30 }, (_, index) => (
        <div
          key={index}
          className="flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-lg border border-border bg-card p-3"
        >
          <Skeleton className="h-16 w-full shrink-0 rounded-md" />
          <div className="flex items-start gap-2">
            <Skeleton className="h-5 w-5 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WikiImportSkeleton() {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <div className="flex h-9 w-full shrink-0 items-center gap-1 rounded-lg bg-muted p-1 md:w-fit">
        <Skeleton className="h-7 min-w-0 flex-1 rounded-md md:w-20 md:flex-none" />
        <Skeleton className="h-7 min-w-0 flex-1 rounded-md md:w-20 md:flex-none" />
      </div>
      <Skeleton className="h-4 w-full max-w-xl shrink-0" />
      <div className="grid min-h-0 w-full min-w-0 flex-1 auto-rows-[minmax(3rem,1fr)] gap-2 overflow-hidden">
        {Array.from({ length: 24 }, (_, index) => (
          <div key={index} className="flex min-w-0 items-center gap-3 rounded-lg border border-border bg-card px-3">
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-4 w-16 shrink-0" />
            <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WikiSearchResultsSkeleton() {
  return (
    <div className="grid min-h-0 w-full min-w-0 flex-1 auto-rows-[minmax(4.5rem,1fr)] gap-2 overflow-hidden">
      {Array.from({ length: 18 }, (_, index) => (
        <div
          key={index}
          className="flex h-full min-h-0 flex-col justify-center gap-2 rounded-md border border-border bg-card px-4 py-3"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Skeleton className="h-4 min-w-0 flex-1" />
            <Skeleton className="h-3 w-16 shrink-0" />
          </div>
          <Skeleton className="h-3 w-4/5 max-w-full" />
          <div className="flex min-w-0 flex-wrap gap-2">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WikiShortcutRowsSkeleton() {
  return (
    <div className="space-y-1">
      <Skeleton className="h-4 w-24" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex min-w-0 items-center gap-2 px-2 py-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded-sm" />
          <Skeleton className="h-4 min-w-0 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function CollectionToolbarSkeleton({ search = true }: { search?: boolean }) {
  return (
    <div className="flex w-full min-w-0 shrink-0 items-center gap-2">
      {search ? <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:max-w-xs" /> : null}
      <Skeleton className={search ? "h-9 w-24 shrink-0 rounded-md" : "h-9 min-w-0 flex-1 rounded-md sm:w-24 sm:flex-none"} />
      <Skeleton className="h-9 w-16 shrink-0 rounded-md" />
    </div>
  );
}

export function WikiHomeSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Skeleton className="h-9 w-full max-w-md shrink-0 rounded-md" />
      <section className="shrink-0 space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex min-w-0 gap-3 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="w-[70%] max-w-64 shrink-0 space-y-2 rounded-xl border border-border bg-card p-3 sm:w-64">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-4 w-32 max-w-full" />
              <Skeleton className="h-3 w-20 max-w-full" />
            </div>
          ))}
        </div>
      </section>
      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <Skeleton className="h-4 w-28 shrink-0" />
        <CollectionToolbarSkeleton search={false} />
        <WikiFillTable headers={WIKI_PAGE_TABLE_HEADERS} />
      </section>
    </div>
  );
}
