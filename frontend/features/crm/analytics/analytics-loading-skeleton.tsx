"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCardGridSkeleton } from "@/components/ui/stat-card";

export function AnalyticsLoadingSkeleton() {
  return (
    <PageWrapper
      title="CRM Analytics"
      subtitle="Pipeline insights and performance metrics"
    >
      <div className="space-y-4">
        <StatCardGridSkeleton cols={4} />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="shadow-sm border-border bg-card">
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-36" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Skeleton className="h-[180px] w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
