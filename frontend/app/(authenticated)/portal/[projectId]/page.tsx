import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PortalDashboardPage } from "@/features/build/client-portal/portal-dashboard-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function PortalProjectRoute({ params }: PageProps) {
  await requirePermission("build:portal:view");
  const { projectId: projectIdStr } = await params;
  const id = parseInt(projectIdStr, 10);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <PortalDashboardPage projectId={id} />;
}
