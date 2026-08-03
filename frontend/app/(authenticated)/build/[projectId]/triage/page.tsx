"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { TriagePage } from "@/features/build/triage/triage-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectTriagePage({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  const projectId = parseInt(projectIdStr, 10);

  if (isNaN(projectId)) return notFound();

  return <TriagePage projectId={projectId} />;
}
