import { requirePermission } from "@/lib/rbac/require-permission";
import { MyReferralsPage } from "@/features/employee-self-service";

export default async function MyReferralsRoute() {
  await requirePermission("self:referrals");
  return <MyReferralsPage />;
}
