import { ViewsPage } from "@/features/build/views/views-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default function ViewsWorkspaceRoute({ params }: PageProps) {
  return <ViewsPage params={params} />;
}
