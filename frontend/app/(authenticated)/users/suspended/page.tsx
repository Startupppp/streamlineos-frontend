import { Metadata } from "next";
import { Suspense } from "react";
import { SuspendedUsersPage } from "@/features/users/suspended-users-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = {
  title: "Suspended Users | StreamlineOS",
};

export default async function Page() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense>
      <SuspendedUsersPage />
    </Suspense>
  );
}
