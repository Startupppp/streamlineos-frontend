"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { CreateJobForm } from "@/features/hr/recruitment/jobs/create-job-form";

export default function NewJobPage() {
  return (
    <PageWrapper
      title="Create New Job Opening"
      backHref="/hr/recruitment/jobs"
      backLabel="Back to Jobs"
      noInternalScroll
      contentClassName="p-0 overflow-hidden"
    >
      <CreateJobForm />
    </PageWrapper>
  );
}
