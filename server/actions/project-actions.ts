"use server";

import { db } from "@/lib/db";
import { 
    projects, 
    organizationMembers,
    projectMembers,
    projectStatuses,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getProjects() {
    const session = await auth();
    if (!session?.user?.id) return [];

    const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id)
    });
    if (!member) return [];

    // Fetch projects for this org
    // In Jira, usually everyone in org can see projects or it's per permission.
    // MVC: Fetch all for org.
    const allProjects = await db.query.projects.findMany({
        where: eq(projects.orgId, member.orgId),
        with: {

            manager: true
        },
        orderBy: [desc(projects.id)]
    });

    return allProjects;
}

export async function createProject(data: {
    name: string;
    key: string;
    description?: string;
    managerId?: string;
    memberIds?: string[];
}) {
    const session = await auth();
    if (!session?.user?.id) return { error: "Unauthorized" };

    const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id)
    });
    if (!member) return { error: "No organization found" };

    // Validate Key
    if (!/^[A-Z]+$/.test(data.key)) {
        return { error: "Project Key must be uppercase letters only (e.g. PROJ)" };
    }

    // Check if key exists in org
    const existing = await db.query.projects.findFirst({
        where: and(
            eq(projects.orgId, member.orgId),
            eq(projects.key, data.key)
        )
    });

    if (existing) {
        return { error: "Project Key already exists" };
    }

    try {
        const [project] = await db.insert(projects).values({
            orgId: member.orgId,
            name: data.name,
            key: data.key,
            description: data.description,
            managerId: data.managerId || session.user.id,
            status: "ACTIVE"
        }).returning();

        const projectId = project.id;

        // Seed default statuses
        const defaultStatuses = [
            { name: "TODO", order: 0, color: "#e2e8f0" },
            { name: "IN_PROGRESS", order: 1, color: "#3b82f6" },
            { name: "IN_REVIEW", order: 2, color: "#eab308" },
            { name: "DONE", order: 3, color: "#22c55e" },
        ];

        await db.insert(projectStatuses).values(
            defaultStatuses.map(s => ({
                orgId: member.orgId,
                projectId: projectId,
                name: s.name,
                order: s.order,
                color: s.color,
            }))
        );

        // Add members if provided
        if (data.memberIds && data.memberIds.length > 0) {
            await db.insert(projectMembers).values(
                data.memberIds.map(userId => ({
                    projectId: projectId,
                    userId: userId,
                    role: "CONTRIBUTOR",
                }))
            );
        }

        revalidatePath("/projects");
        return { success: true };
    } catch (e) {
        console.error(e);
        return { error: "Failed to create project" };
    }
}

export async function getProjectById(projectId: number) {
     const session = await auth();
    if (!session?.user?.id) return null;

    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
        with: {

            manager: true
        }
    });

    return project;
}
