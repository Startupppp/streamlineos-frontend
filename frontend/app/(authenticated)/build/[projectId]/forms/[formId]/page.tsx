"use client";

import { use } from "react";
import { FormDetailPage } from "@/features/build/forms/form-detail-page";

interface PageProps {
  params: Promise<{ projectId: string; formId: string }>;
}

export default function FormDetailRoute({ params }: PageProps) {
  const { projectId, formId } = use(params);
  return (
    <FormDetailPage
      projectId={parseInt(projectId, 10)}
      formId={parseInt(formId, 10)}
    />
  );
}
