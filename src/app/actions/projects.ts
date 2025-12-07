"use server";

import { db } from "@/lib/db";
import { projects, tickets, users } from "@/lib/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProjects() {
   const { userId } = await auth();
   if (!userId) throw new Error("Unauthorized");

   return await db.query.projects.findMany({
       with: {
        // tickets: true // if needed
       }
   });
}

export async function getProjectDetails(projectId: number) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
    });

    const allTickets = await db.query.tickets.findMany({
        where: eq(tickets.projectId, projectId),
        with: {
            assignee: true
        }
    });

    return { project, tickets: allTickets };
}

export async function createTicket(data: { title: string; projectId: number; description?: string; type?: "TASK" | "BUG" | "EPIC" | "STORY" }) {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await db.insert(tickets).values({
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
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    await db.update(tickets)
        .set({ status, updatedAt: new Date() })
        .where(eq(tickets.id, ticketId));

    revalidatePath("/projects"); // Revalidate broadly or specifically
}
