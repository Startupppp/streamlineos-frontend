"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateProject, useAddProjectMember } from "@/hooks/api/projects/projects";
import { useApplyProjectTemplate } from "@/hooks/api/projects/templates";
import { getErrorMessage } from "@/lib/get-error-message";
import type { WizardDraft } from "./use-project-create";

export function useProjectProvisioning(onSuccess: () => void) {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const router = useRouter();
  const createProject = useCreateProject();
  const applyTemplate = useApplyProjectTemplate();
  const addMember = useAddProjectMember();

  async function provision(draft: WizardDraft) {
    setIsProvisioning(true);
    try {
      let projectId: number;

      if (draft.templateId !== null) {
        const result = await applyTemplate.mutateAsync({
          templateId: draft.templateId,
          input: {
            name: draft.name,
            description: draft.description || undefined,
            managerId: draft.managerId || undefined,
            startDate: draft.startDate || undefined,
            endDate: draft.endDate || undefined,
          },
        });
        projectId = result.projectId;

        if (draft.memberIds.length > 0) {
          const results = await Promise.allSettled(
            draft.memberIds.map((userId) =>
              addMember.mutateAsync({ projectId, userId })
            )
          );
          const failCount = results.filter((r) => r.status === "rejected").length;
          if (failCount > 0) {
            toast.warning(`Project created, but ${failCount} member invite(s) failed.`);
          }
        }
      } else {
        const project = await createProject.mutateAsync({
          name: draft.name,
          key: draft.key || undefined,
          description: draft.description || undefined,
          managerId: draft.managerId || undefined,
          clientId: draft.clientId || undefined,
          memberIds: draft.memberIds.length > 0 ? draft.memberIds : undefined,
          startDate: draft.startDate || undefined,
          endDate: draft.endDate || undefined,
          modules: draft.modules,
        });
        projectId = project.id;
      }

      toast.success("Project created");
      onSuccess();
      router.push(`/projects/${projectId}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("409")) {
        toast.error("Duplicate project key — go back to Basics and choose a different one.");
      } else {
        toast.error(getErrorMessage(error));
      }
    } finally {
      setIsProvisioning(false);
    }
  }

  return { provision, isProvisioning };
}
