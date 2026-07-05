"use client";

import { use } from "react";
import { ReleasesPage } from "@/features/projects/releases/releases-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ReleasesRoute({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  return <ReleasesPage projectId={Number(projectIdStr)} />;
}
