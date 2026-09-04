import { MyAttendancePage } from "@/features/employee-self-service";
import { requireSession } from "@/lib/rbac/require-permission";

export default async function MyAttendanceRoute() {
  await requireSession();
  return <MyAttendancePage />;
}
