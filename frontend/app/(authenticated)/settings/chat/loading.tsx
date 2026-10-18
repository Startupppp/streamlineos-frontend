import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatSettingsLoading() {
  return (
    <PageWrapper
      title="Chat Settings"
      subtitle="Organisation-wide defaults for channels, attachments and huddles."
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <Card className="max-w-2xl">
        <CardContent className="space-y-6 pt-6">
          <Skeleton className="h-14 w-64" />
          <Skeleton className="h-14 w-40" />
          <Skeleton className="h-14 w-40" />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
