import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function AutomationsLoading() {
  return (
    <PageWrapper
      title="Workflow Automation"
      subtitle="Automate repetitive CRM tasks with triggers and actions"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-4 w-36 rounded-full" />
                    <Skeleton className="h-4 w-28 rounded-full" />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <Skeleton className="h-4 w-14 rounded-full" />
                    <Skeleton className="h-3.5 w-32" />
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Skeleton className="h-5 w-9 rounded-full" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
