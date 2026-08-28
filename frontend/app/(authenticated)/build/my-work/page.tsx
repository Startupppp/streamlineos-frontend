import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { RequireModule } from "@/components/auth/require-module";
import { MyWorkPage } from "@/features/build/my-work/my-work-page";

export default async function MyWorkRoute() {
  await enforceRouteAccess("/build/my-work");
  return (
    <RequireModule module="build">
      <MyWorkPage />
    </RequireModule>
  );
}
