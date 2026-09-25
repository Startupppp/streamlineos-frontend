import { requirePermission } from "@/lib/rbac/require-permission";
import { InterviewerPerformancePage } from "@/features/recruitment/interviewer-performance-page";

export default async function RecruitmentInterviewerPerformanceRoute() {
  await requirePermission("hr:interviews:view");
  return <InterviewerPerformancePage />;
}
