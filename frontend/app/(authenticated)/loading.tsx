import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

const HEADER_TILES = [1, 2, 3, 4];
const BODY_ROWS = [1, 2, 3, 4, 5, 6];

export default function AuthenticatedSegmentLoading() {
  return (
    <PageWrapper title="Loading" subtitle="Opening this section">
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HEADER_TILES.map((tile) => (
            <Skeleton key={tile} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          {BODY_ROWS.map((row) => (
            <Skeleton key={row} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
