import { ProjectSettingsPage } from "@/features/build/settings/project-settings-page";

interface PageProps {
  params: Promise<{ pmWorkspaceId: string; projectId: string }>;
}

export default function ProjectSettingsWorkspaceRoute({ params }: PageProps) {
  return <ProjectSettingsPage params={params} />;
}
