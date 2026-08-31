import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { AllWorkPage } from "@/features/build/all-work/all-work-page";

export const metadata = {
  title: "All Work | Projects",
};

export default async function Page() {
  await enforceRouteAccess("/build/all-work");
  return <AllWorkPage />;
}
