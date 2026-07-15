import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function HrAssetsLoading() {
  return (
    <PageWrapper
      title="Assets"
      subtitle="Manage company assets and assignments"
      actions={<Skeleton className="h-4 w-28 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
                <Skeleton className="h-12 w-12" />{" "}
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-9 w-72 rounded-md" />
        <DataTableSkeleton rows={12} columns={8} />
      </div>
    </PageWrapper>
  );
}
