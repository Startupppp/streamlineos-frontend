"use client";

import { use } from "react";
import { DecisionsPage } from "@/features/build/governance/decisions-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectDecisionsRoute({ params }: PageProps) {
  const { projectId } = use(params);
  return <DecisionsPage projectId={parseInt(projectId, 10)} />;
}
