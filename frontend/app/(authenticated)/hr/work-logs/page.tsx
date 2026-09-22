import { Suspense } from "react";
import { WorkLogsPage } from "@/features/hr/work-logs/work-logs-page";
import WorkLogsLoading from "./loading";

export default function Page() {
  return (
    <Suspense fallback={<WorkLogsLoading />}>
      <WorkLogsPage />
    </Suspense>
  );
}
