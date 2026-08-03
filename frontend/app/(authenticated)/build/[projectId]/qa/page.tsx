"use client";

import { use } from "react";
import { QaPage } from "@/features/build/qa/qa-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function QaRoute({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  return <QaPage projectId={parseInt(projectIdStr, 10)} />;
}
