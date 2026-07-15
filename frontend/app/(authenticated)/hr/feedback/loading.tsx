import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function FeedbackLoading() {
  return (
    <PageWrapper
      title="360° Feedback"
      subtitle="Manage feedback cycles and review submissions"
    >
      <div className="space-y-6">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Card
              key={i}
              className="bg-card border border-border rounded-xl shadow-sm"
            >
              <CardContent className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-4 w-24 rounded-lg" />{" "}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
