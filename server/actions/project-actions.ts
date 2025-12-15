"use server";

import { db } from "@/lib/db";
import { 
    projects, 
    organizationMembers
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
        await db.insert(projects).values({
            orgId: member.orgId,
            name: data.name,
            key: data.key,
            description: data.description,
            managerId: data.managerId || session.user.id,
            status: "ACTIVE"
        });

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
