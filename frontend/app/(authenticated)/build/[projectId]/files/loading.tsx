import { PageWrapper } from "@/components/ui/page-wrapper";
import { ProjectFilesSkeleton } from "@/features/build/files/project-files-skeleton";

export default function ProjectFilesLoading() {
  return (
    <PageWrapper title="Files" subtitle="Project files and documents">
      <ProjectFilesSkeleton />
    </PageWrapper>
  );
}
