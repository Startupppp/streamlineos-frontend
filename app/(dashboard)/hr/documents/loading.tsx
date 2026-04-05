import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function DocumentsLoading() {
  return (
    <PageWrapper title="Documents" subtitle="Manage HR documents and files.">
      <div className="flex-1 space-y-6">
        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3">
          <Skeleton className="h-10 w-[120px] rounded-md" />
          <Skeleton className="h-10 w-[160px] rounded-md" />
        </div>

        {/* Search + Category Tabs */}
        <Card className="shadow-sm border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Skeleton className="h-10 flex-1 min-w-[200px] max-w-md rounded-md" />
              <Skeleton className="h-9 w-[76px] rounded-md" />
              <div className="flex items-center gap-1">
                {["All Files", "Contracts", "Policies", "Tax Forms", "Templates", "Payroll"].map((tab) => (
                  <Skeleton key={tab} className="h-8 rounded-full" style={{ width: `${tab.length * 9 + 24}px` }} />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Table */}
        <Card className="shadow-sm border overflow-hidden">
          <CardContent className="p-0">
            {/* Table Header */}
            <div className="flex items-center bg-muted/30 px-6 py-3 border-b">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16 ml-auto mr-32" />
              <Skeleton className="h-3 w-24 mr-16" />
              <Skeleton className="h-3 w-8 ml-auto" />
            </div>

            {/* Folders Label */}
            <div className="px-6 py-3">
              <Skeleton className="h-3 w-14" />
            </div>

            {/* Folder Cards Grid */}
            <div className="px-6 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                    <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                    <div className="min-w-0 space-y-1.5">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Document Rows */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center px-6 py-4 border-t">
                <div className="flex items-center gap-3 flex-1">
                  <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-44" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-4 w-14 rounded-full" />
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-24 ml-16" />
                <Skeleton className="h-4 w-12 ml-auto" />
              </div>
            ))}

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <Skeleton className="h-4 w-52" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-[72px] rounded-md" />
                <Skeleton className="h-8 w-[52px] rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="w-32 h-2 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </PageWrapper>
  );
}
