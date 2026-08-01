import { requirePermission } from "@/lib/rbac/require-permission";
import { FeedbackPage } from "@/features/hr/feedback/feedback-page";

export default async function HrFeedbackPage() {
  await requirePermission("hr:feedback:view");
  return <FeedbackPage />;
}
