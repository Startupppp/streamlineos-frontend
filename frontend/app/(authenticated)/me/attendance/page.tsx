import { MyAttendancePage } from "@/features/employee-self-service/components/my-attendance-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export default async function MyAttendanceRoute() {
  await requirePermission("self:attendance");
  return <MyAttendancePage />;
}
