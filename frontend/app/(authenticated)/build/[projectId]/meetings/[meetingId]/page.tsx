"use client";

import { use } from "react";
import { MeetingDetailPage } from "@/features/build/meetings/meeting-detail-page";

interface PageProps {
  params: Promise<{ projectId: string; meetingId: string }>;
}

export default function ProjectMeetingDetailRoute({ params }: PageProps) {
  const { projectId, meetingId } = use(params);
  return (
    <MeetingDetailPage
      projectId={parseInt(projectId, 10)}
      meetingId={parseInt(meetingId, 10)}
    />
  );
}
