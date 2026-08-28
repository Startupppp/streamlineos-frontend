import { MyTicketsPage } from "@/features/build/my-tickets/my-tickets-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default async function MyTicketsWorkspaceRoute({ params }: PageProps) {
  return <MyTicketsPage params={params} />;
}
