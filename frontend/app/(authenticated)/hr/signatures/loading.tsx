import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SignaturesLoading() {
  return (
    <PageWrapper
      title="Digital Signatures"
      subtitle="Send, sign, and track document signatures"
      actions={<Skeleton className="h-8 w-32 rounded-md" />}
    >
      <div className="space-y-4">
        <div className="flex gap-2 p-1 bg-slate-100/80 rounded-xl w-fit">
          {["Received", "Sent", "Completed", "Voided"].map((tab) => (
            <Skeleton
              key={tab}
              className="h-7 rounded-lg"
              style={{ width: `${tab.length * 9 + 24}px` }}
            />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60"
            >
              <CardContent className="p-5 space-y-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-7 w-16 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
