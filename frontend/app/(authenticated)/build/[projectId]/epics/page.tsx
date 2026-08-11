import { EpicsPage } from "@/features/build/epics/epics-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function EpicsRoute({ params }: PageProps) {
  return <EpicsPage params={params} />;
}
