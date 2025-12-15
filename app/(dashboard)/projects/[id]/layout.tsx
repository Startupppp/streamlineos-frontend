import { getProjectById } from "@/server/actions/project-actions";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { notFound } from "next/navigation";

export default async function ProjectLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    const project = await getProjectById(Number(id));

    if (!project) {
        return notFound();
    }

    return (
        <div className="flex h-full">
            <ProjectSidebar 
                projectId={id} 
                projectName={project.name} 
                projectKey={project.key} 
            />
            <div className="flex-1 overflow-auto bg-background">
                {children}
            </div>
        </div>
    );
}
