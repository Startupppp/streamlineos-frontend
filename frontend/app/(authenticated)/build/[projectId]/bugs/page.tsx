"use client";

import { use } from "react";
import { BugsPage } from "@/features/build/bugs/bugs-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function BugsRoute({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  return <BugsPage projectId={parseInt(projectIdStr, 10)} />;
}
