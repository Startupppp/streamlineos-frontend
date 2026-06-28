"server-only";

import { serverApiClient } from "@/lib/api/server-client";

export interface ProjectAccessDTO {
  id: number;
  name: string;
  key: string;
  orgId: string;
  managerId: string | null;
}

export async function getProjectAccessForUser(
  projectId: number,
  _userId: string,
): Promise<ProjectAccessDTO | null> {
  try {
    return await serverApiClient.get<ProjectAccessDTO>(`/projects/${projectId}`);
  } catch {
    return null;
  }
}
