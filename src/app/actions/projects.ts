"use server";

import { db } from "@/lib/db";
import { projects, tickets, users } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProjects() {
   const { orgId } = await auth();
   if (!orgId) return [];

   return await db.query.projects.findMany({
       where: eq(projects.orgId, orgId),
       with: {
        // tickets: true // if needed
       }
   });
}

export async function getProjectDetails(projectId: number) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.orgId, orgId)),
    });

    if (!project) return null;

    const allTickets = await db.query.tickets.findMany({
        where: and(eq(tickets.projectId, projectId), eq(tickets.orgId, orgId)),
        with: {
            assignee: true
        }
    });

    return { project, tickets: allTickets };
}

export async function createTicket(data: { title: string; projectId: number; description?: string; type?: "TASK" | "BUG" | "EPIC" | "STORY" }) {
    const { orgId, userId } = await auth();
    if (!orgId || !userId) throw new Error("Unauthorized");

    await db.insert(tickets).values({
        orgId,
        title: data.title,
        projectId: data.projectId,
        description: data.description,
        type: data.type || "TASK",
        status: "TODO",
        reporterId: userId,
    });
    
    revalidatePath(`/projects/${data.projectId}`);
}

export async function updateTicketStatus(ticketId: number, status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE") {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    // Ideally verify orgId of the ticket first
    await db.update(tickets)
        .set({ status, updatedAt: new Date() })
        .where(and(eq(tickets.id, ticketId), eq(tickets.orgId, orgId)));

    revalidatePath("/projects");
}

export async function updateProjectSettings(projectId: number, data: { name: string; description?: string; status: string }) {
    const { orgId } = await auth();
    if (!orgId) throw new Error("Unauthorized");

    await db.update(projects)
        .set({
            name: data.name,
            description: data.description,
            status: data.status,
        })
        .where(and(eq(projects.id, projectId), eq(projects.orgId, orgId)));
    
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/projects");
}
