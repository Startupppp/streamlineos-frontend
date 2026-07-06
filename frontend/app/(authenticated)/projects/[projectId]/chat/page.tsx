"use client";

import { use } from "react";
import { ProjectChatPanel } from "@/features/projects/chat/project-chat-panel";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectChatRoute({ params }: PageProps) {
  const { projectId } = use(params);
  return <ProjectChatPanel projectId={parseInt(projectId, 10)} />;
}
