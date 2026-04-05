import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function RecruitmentLoading() {
  return (
    <PageWrapper title="Recruitment" subtitle="Hire the best talent for your team">
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-4 w-16 mb-2" /><Skeleton className="h-8 w-10" /></CardContent></Card>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
