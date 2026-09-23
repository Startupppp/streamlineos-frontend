import { notFound } from "next/navigation";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { UpdatesPage } from "@/features/build/updates/updates-page";

export const metadata = {
  title: "Updates | Project",
};

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function ProjectUpdatesRoute({ params }: Props) {
  await enforceRouteAccess("/build/[projectId]/updates");
  const { projectId } = await params;
  const parsed = Number(projectId);
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();
  return <UpdatesPage projectId={parsed} />;
}
