import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function CoursesLoading() {
  return (
    <PageWrapper
      title="Course Library"
      subtitle="Explore and enroll in courses"
      actions={<Skeleton className="h-8 w-36 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>

        <div className="flex gap-3">
          <Skeleton className="h-8 w-40 rounded-md" />
          <Skeleton className="h-8 w-36 rounded-md" />
          <Skeleton className="h-8 w-40 rounded-md" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-36 w-full rounded-none" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
