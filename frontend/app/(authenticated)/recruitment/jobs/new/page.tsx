import { PageWrapper } from "@/components/ui/page-wrapper";
import { CreateJobForm } from "@/features/recruitment/jobs/create-job-form";

export default async function NewJobPage() {
  return (
    <PageWrapper
      title="Create New Job Opening"
      backHref="/recruitment/jobs"
      backLabel="Back to Jobs"
      noInternalScroll
      contentClassName="p-0 overflow-hidden"
    >
      <CreateJobForm />
    </PageWrapper>
  );
}
