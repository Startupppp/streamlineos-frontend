import { EpicsPage } from "@/features/build/epics/epics-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default function EpicsWorkspaceRoute({ params }: PageProps) {
  return <EpicsPage params={params} />;
}
