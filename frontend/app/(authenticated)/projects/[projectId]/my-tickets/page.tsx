"use client";

import { MyTicketsPage } from "@/features/projects/my-tickets/my-tickets-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function TicketsPage({ params }: PageProps) {
  return <MyTicketsPage params={params} />;
}
