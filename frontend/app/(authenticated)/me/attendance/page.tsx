import { MyAttendancePage } from "@/features/employee-self-service/components/my-attendance-page";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function MyAttendanceRoute() {
  await requireSession();
  return <MyAttendancePage />;
}
