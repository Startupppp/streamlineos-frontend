"use client";

import { use } from "react";
import { AiAssistantPage } from "@/features/build/ai/ai-assistant-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectAiRoute({ params }: PageProps) {
  const { projectId } = use(params);
  return <AiAssistantPage projectId={parseInt(projectId, 10)} />;
}
