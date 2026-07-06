"use client";

import { use } from "react";
import { FormsListPage } from "@/features/projects/forms/forms-list-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectFormsRoute({ params }: PageProps) {
  const { projectId } = use(params);
  return <FormsListPage projectId={parseInt(projectId, 10)} />;
}
