import { ProjectSettingsPage } from "@/features/build/settings/project-settings-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectSettingsRoute({ params }: PageProps) {
  return <ProjectSettingsPage params={params} />;
}
