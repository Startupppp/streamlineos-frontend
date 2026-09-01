import { Suspense } from "react";
import { ProjectsClient } from "@/features/inventory/components/buildmart/projects-client";
import ProjectsLoading from "./loading";

export default function ProjectsPage() {
  // `useSearchParams` in the client component needs a Suspense boundary, or the
  // whole route opts out of static rendering with a build-time warning.
  return (
    <Suspense fallback={<ProjectsLoading />}>
      <ProjectsClient />
    </Suspense>
  );
}
