import type { Metadata } from "next";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { CalendarResourceApprovalQueue } from "@/features/calendar/calendar-resource-approval-queue";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

export const metadata: Metadata = { title: "Calendar Resource Approvals | StreamlineOS" };

export default async function CalendarResourceApprovalsPage() {
  await enforceRouteAccess("/calendar/resource-approvals");
  return <PageWrapper title="Resource approvals" subtitle="Review rooms and source-owned equipment awaiting an owner decision."><CalendarResourceApprovalQueue /></PageWrapper>;
}
