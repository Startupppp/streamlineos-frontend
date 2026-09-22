import { redirect } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TicketsPage({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/my-tickets");
  const { projectId } = await params;
  redirect(`/build/my-work?projectId=${encodeURIComponent(projectId)}`);
}
