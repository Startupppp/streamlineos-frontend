import { getProjectById } from "@/server/actions/project-actions";
import { notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/layout/project-sidebar";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { organizationMembers, projects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { EmptyState } from "@/components/ui/empty-state";
import { Lock } from "lucide-react";

export default async function ProjectLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ id: string }>
}) {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
        return notFound();
    }

    // First check if project exists
    const projectCheck = await db.query.projects.findFirst({
        where: eq(projects.id, Number(id)),
        columns: { id: true, name: true, key: true, orgId: true, managerId: true }
    });

    if (!projectCheck) {
        return notFound();
    }

    // Check user access
    const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id)
    });

    if (!member || member.orgId !== projectCheck.orgId) {
        return notFound();
    }

    const isOwnerOrAdmin = member.role === "OWNER" || member.role === "ADMIN";

    // OWNER/ADMIN can see projects in list but need access to view details
    // Get full project details only if user has access
    const project = await getProjectById(Number(id));

    // If no access, show access denied message (for OWNER/ADMIN who can see it in list)
    if (!project) {
        // Only show access denied if they're OWNER/ADMIN (they can see it in list)
        // Regular users just get notFound
        if (isOwnerOrAdmin) {
            return (
                <div className="flex items-center justify-center h-full w-full p-8">
                    <EmptyState
                        icon={Lock}
                        title="Access Denied"
                        description="You don't have permission to view this project. Please contact the project manager to request access."
                    />
                </div>
            );
        }
        return notFound();
    }

    return (
        <div className="flex h-full w-full -m-4 md:-m-8">
            <div className="pl-4 md:pl-6">
                <ProjectSidebar 
                    projectId={id} 
                    projectName={project.name} 
                    projectKey={project.key} 
                />
            </div>
            <div className="flex-1 bg-background min-w-0 w-full overflow-y-auto" style={{ overflowX: 'visible' }}>
                {children}
            </div>
        </div>
    );
}
