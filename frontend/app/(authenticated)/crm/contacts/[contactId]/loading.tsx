import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function ContactDetailLoading() {
  return (
    <PageWrapper title="Contact" subtitle="Loading...">
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <Skeleton className="h-16 w-16 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-4 w-20 rounded-full" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pb-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ))}
              </CardContent>
              <div className="px-5 pb-5 space-y-2">
                <div className="flex gap-2">
                  <Skeleton className="h-9 flex-1 rounded-md" />
                  <Skeleton className="h-9 flex-1 rounded-md" />
                </div>
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-1.5">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-3 w-14" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="flex gap-3 ml-4 pl-4 border-l border-border/60">
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-16 rounded-full shrink-0" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full rounded-md" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-24 rounded-md" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {["Deal", "Stage", "Value", "Close Date"].map((h) => (
                          <th key={h} className="text-left px-4 py-2.5">
                            <Skeleton className="h-3 w-16" />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-4 py-2.5"><Skeleton className="h-4 w-32" /></td>
                          <td className="px-4 py-2.5"><Skeleton className="h-4 w-20 rounded-full" /></td>
                          <td className="px-4 py-2.5"><Skeleton className="h-4 w-16" /></td>
                          <td className="px-4 py-2.5"><Skeleton className="h-4 w-20" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
