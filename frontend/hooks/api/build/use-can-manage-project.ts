"use client";

import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { useProject, useProjectMembers } from "@/hooks/api/build/projects";

export function useCanManageProject(projectId: number): boolean {
  const orgWideCanManage = useCan("build:manage");
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { data: project } = useProject(projectId);
  const { data: members } = useProjectMembers(projectId);

  if (orgWideCanManage) return true;

  if (!currentUserId) return false;

  if (project?.managerId === currentUserId) return true;

  if (
    members?.some(
      (m) => m.id === currentUserId && m.role?.toUpperCase() === "ADMIN",
    )
  ) {
    return true;
  }

  return false;
}
