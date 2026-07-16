import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function CareerDevelopmentLoading() {
  return (
    <PageWrapper
      title="Career Development"
      subtitle="Grow with structured paths and milestones"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="space-y-4">
        <Skeleton className="h-9 w-72 rounded-md" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
