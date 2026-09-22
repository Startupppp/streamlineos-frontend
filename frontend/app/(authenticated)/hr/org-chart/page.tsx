import { Suspense } from "react";
import { OrgChartPage } from "@/features/hr/org-chart";
import OrgChartLoading from "./loading";

export default function Page() {
  return (
    <Suspense fallback={<OrgChartLoading />}>
      <OrgChartPage />
    </Suspense>
  );
}
