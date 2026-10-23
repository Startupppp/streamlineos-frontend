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

export function WikiFillTable({ headers }: { headers: readonly string[] }) {
  const columns = headers.length;
  const template = wikiTableColumns(headers);
  return (
    <div
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-card"
      data-testid="loading-skeleton"
    >
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
        className="grid min-h-0 flex-1 auto-rows-[minmax(2.5rem,1fr)] overflow-hidden"
        style={{ gridTemplateColumns: template }}
      >
        {Array.from({ length: columns * 32 }, (_, index) => (
          <div key={index} className="flex items-center border-b border-border/50 px-3">
            <Skeleton className={index % columns === 0 ? "h-3.5 w-3/4" : "h-3.5 w-1/2"} />
          </div>
        ))}
      </div>
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
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:minmax(4.75rem,1fr)]">
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
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 lg:grid-cols-3 [grid-auto-rows:minmax(7.5rem,1fr)]">
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
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex h-9 w-fit shrink-0 items-center gap-1 rounded-lg bg-muted p-1">
        <Skeleton className="h-7 w-20 rounded-md" />
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>
      <Skeleton className="h-4 w-full max-w-xl shrink-0" />
      <div className="grid min-h-0 flex-1 auto-rows-[minmax(3rem,1fr)] gap-2 overflow-hidden">
        {Array.from({ length: 24 }, (_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="ml-auto h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function WikiSearchResultsSkeleton() {
  return (
    <div className="grid min-h-0 flex-1 auto-rows-[minmax(4.5rem,1fr)] gap-2 overflow-hidden">
      {Array.from({ length: 18 }, (_, index) => (
        <div
          key={index}
          className="flex h-full min-h-0 flex-col justify-center gap-2 rounded-md border border-border bg-card px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="ml-auto h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-4/5" />
          <div className="flex gap-2">
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
        <div key={index} className="flex items-center gap-2 px-2 py-1.5">
          <Skeleton className="h-3.5 w-3.5 rounded-sm" />
          <Skeleton className="h-4 w-40" />
        </div>
      ))}
    </div>
  );
}

export function CollectionToolbarSkeleton({ search = true }: { search?: boolean }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {search ? <Skeleton className="h-9 w-full rounded-md sm:w-72" /> : null}
      <Skeleton className="h-9 w-24 rounded-md" />
      <Skeleton className="ml-auto h-9 w-16 rounded-md" />
    </div>
  );
}

export function WikiHomeSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Skeleton className="h-9 w-full max-w-md shrink-0 rounded-md" />
      <section className="shrink-0 space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="w-56 shrink-0 space-y-2 rounded-xl border border-border bg-card p-3 sm:w-64">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
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
