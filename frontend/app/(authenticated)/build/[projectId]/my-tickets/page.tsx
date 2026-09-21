import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { MyTicketsPage } from "@/features/build/my-tickets/my-tickets-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function TicketsPage({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/my-tickets");
  return <MyTicketsPage params={params} />;
}
