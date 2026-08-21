import type { Metadata } from "next";
import { WorkersPage } from "@/features/directory/workers/workers-page";
import { requirePermission } from "@/lib/rbac/require-permission";

export const metadata: Metadata = {
  title: "Workers | StreamlineOS",
};

export default async function WorkersRoute() {
  await requirePermission("directory:workers:view");
  return <WorkersPage />;
}
