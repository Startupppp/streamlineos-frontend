import { ViewsPage } from "@/features/build/views/views-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ViewsRoute({ params }: PageProps) {
  return <ViewsPage params={params} />;
}
