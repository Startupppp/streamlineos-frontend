import { Suspense } from "react";
import { RecruitmentPipelinePage } from "@/features/hr/recruitment/pipeline-page";
import PipelineLoading from "./loading";

export default function Page() {
  return (
    <Suspense fallback={<PipelineLoading />}>
      <RecruitmentPipelinePage />
    </Suspense>
  );
}
