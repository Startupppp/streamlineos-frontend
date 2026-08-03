import { AutomationsPage } from "@/features/build/automations/automations-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function AutomationsRoute({ params }: PageProps) {
  const { projectId: projectIdStr } = await params;
  return <AutomationsPage projectId={parseInt(projectIdStr, 10)} />;
}
