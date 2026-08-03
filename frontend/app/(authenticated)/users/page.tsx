import { Metadata } from "next";
import { Suspense } from "react";
import { UsersPage } from "@/features/users/users-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = {
  title: "Users | StreamlineOS",
};

export default async function Page() {
  await requirePermission("settings:view");
  return (
    <Suspense>
      <UsersPage />
    </Suspense>
  );
}
