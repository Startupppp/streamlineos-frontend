import { Metadata } from "next";
import { Suspense } from "react";
import { ArchivedUsersPage } from "@/features/users/archived-users-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = {
  title: "Archived Users | StreamlineOS",
};

export default async function Page() {
  await requirePermission("hr:employees:view");
  return (
    <Suspense>
      <ArchivedUsersPage />
    </Suspense>
  );
}
