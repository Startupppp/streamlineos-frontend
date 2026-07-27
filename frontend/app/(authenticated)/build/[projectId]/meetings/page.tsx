"use client";

import { use } from "react";
import { MeetingsListPage } from "@/features/build/meetings/meetings-list-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectMeetingsRoute({ params }: PageProps) {
  const { projectId } = use(params);
  return <MeetingsListPage projectId={parseInt(projectId, 10)} />;
}
