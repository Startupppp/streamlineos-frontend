import { Suspense } from "react";
import { ProjectsClient } from "@/features/inventory/components/materials/projects-client";
import ProjectsLoading from "./loading";

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsLoading />}>
      <ProjectsClient />
    </Suspense>
  );
}
