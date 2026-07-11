import { requirePermission } from "@/lib/rbac/require-permission";
import { EventStreamPageContent } from "@/features/hr/enterprise/ops/event-stream/event-stream-page-content";

export default async function HrEventStreamPage() {
  await requirePermission("hr:eventstream:view");
  return <EventStreamPageContent />;
}
