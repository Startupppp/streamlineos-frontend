"use server";

import { serverApiClient } from "@/lib/api/server-client";

interface ProjectDetail {
    id: number;
    name: string;
    key: string;
}

export async function getProjectById(projectId: number) {
    try {
        return await serverApiClient.get<ProjectDetail>(`/projects/${projectId}`);
    } catch {
        return null;
    }
}
