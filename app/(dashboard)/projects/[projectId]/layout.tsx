import Link from "next/link";
import { getProjectById } from "@/server/actions/project-actions";
import { notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationMembers, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { AccessDeniedView } from "./access-denied-view";

export default async function ProjectLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ projectId: string }>
}) {
    const { projectId } = await params;
    const numId = Number(projectId);
    if (isNaN(numId)) return notFound();

    const session = await auth();
    if (!session?.user?.id) return notFound();

    const projectCheck = await db.query.projects.findFirst({
        where: eq(projects.id, numId),
        columns: { id: true, name: true, key: true, orgId: true, managerId: true }
    });
    if (!projectCheck) return notFound();

    const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id)
    });
    if (!member || member.orgId !== projectCheck.orgId) return notFound();

    const project = await getProjectById(numId);
    if (!project) {
        return <AccessDeniedView projectName={projectCheck.name} />;
    }

    return (
        <div className="flex h-full w-full -m-4 md:-m-8">
            <div className="pl-4 md:pl-6">
                <ProjectSidebar 
                    projectId={projectId}
                    projectName={project.name} 
                    projectKey={project.key} 
                />
            </div>
            <div className="flex-1 bg-background min-w-0 w-full overflow-y-auto flex flex-col" style={{ overflowX: 'visible' }}>
                <div className="flex-shrink-0 px-4 md:px-6 pt-3 pb-1 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <Link
                        href="/projects"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Projects
                    </Link>
                </div>
                {children}
            </div>
        </div>
    );
}
