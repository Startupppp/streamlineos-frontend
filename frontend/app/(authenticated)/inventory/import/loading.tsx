import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ImportLoading() {
  return (
    <PageWrapper title="Import & Export">
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-9 w-20 rounded-sm" />
        <Skeleton className="h-9 w-20 rounded-sm" />
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-28 rounded-full" />
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
