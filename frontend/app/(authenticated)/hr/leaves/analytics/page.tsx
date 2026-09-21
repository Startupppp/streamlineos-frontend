import { requirePermission } from "@/lib/rbac/require-permission";
import { LeaveAnalyticsClient } from "@/features/hr/leaves/components/leave-analytics-client";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default async function LeaveAnalyticsPage() {
  await requirePermission("hr:leaves:view");
  return (
    <PageWrapper
      title="Leave Analytics"
      subtitle="Summary from People analytics"
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/hr/analytics">
            Open people analytics <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      }
    >
      <LeaveAnalyticsClient />
    </PageWrapper>
  );
}
