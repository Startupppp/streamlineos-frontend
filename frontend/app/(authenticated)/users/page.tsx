import { Metadata } from "next";
import { Suspense } from "react";
import { PeoplePage } from "@/features/users/people-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = {
  title: "People | StreamlineOS",
};

export default async function Page() {
  await requirePermission("settings:view");
  return (
    <Suspense>
      <PeoplePage />
    </Suspense>
  );
}
