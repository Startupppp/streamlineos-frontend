"use server";

import { auth } from "@/lib/auth";
import { serverApiClient } from "@/lib/api/server-client";

interface ProjectDetail {
    id: number;
    name: string;
    key: string;
}

export async function getProjectById(projectId: number) {
    const session = await auth();
    if (!session?.user?.id) return null;
    try {
        return await serverApiClient.get<ProjectDetail>(`/projects/${projectId}`);
    } catch {
        return null;
    }
}
