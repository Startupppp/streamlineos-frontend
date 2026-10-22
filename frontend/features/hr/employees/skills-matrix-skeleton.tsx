import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

const MATRIX_ROW_KEYS = [1, 2, 3, 4, 5];
const MATRIX_COL_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function SkillsMatrixSkeleton() {
  return (
    <PageWrapper
      title="Skills Matrix"
      subtitle="Cross-reference of employees and their skill levels across the org"
    >
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex border-b bg-muted/40 px-3 py-2 gap-4">
          <Skeleton className="h-4 w-32" />
          {MATRIX_COL_KEYS.map((key) => (
            <Skeleton key={key} className="h-4 w-16" />
          ))}
        </div>
        {MATRIX_ROW_KEYS.map((key) => (
          <div key={key} className="flex items-center border-b last:border-0 px-3 py-2.5 gap-4">
            <div className="flex items-center gap-2 w-40 shrink-0">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            {MATRIX_COL_KEYS.map((colKey) => (
              <Skeleton key={colKey} className="h-5 w-16 rounded" />
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
