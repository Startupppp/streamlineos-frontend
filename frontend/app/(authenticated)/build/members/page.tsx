import { Suspense } from "react";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { MembersPage } from "@/features/build/members/members-page";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export const metadata = {
  title: "Members",
};

export default async function ProjectsMembersPage() {
  await enforceRouteAccess("/build/members");
  return (
    <Suspense fallback={<DataTableSkeleton rows={10} columns={5} className="m-6" />}>
      <MembersPage />
    </Suspense>
  );
}
