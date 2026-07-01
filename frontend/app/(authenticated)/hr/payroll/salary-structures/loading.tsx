import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SalaryStructuresLoading() {
  return (
    <PageWrapper
      title="Salary Structure Templates"
      subtitle="Define reusable salary structures to assign to employees."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Skeleton className="h-9 rounded-lg" />
                <Skeleton className="h-9 rounded-lg" />
              </div>
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
