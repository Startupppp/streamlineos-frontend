"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCreateProject, useAddProjectMember } from "@/hooks/api/build/projects";
import { useApplyProjectTemplate } from "@/hooks/api/build/templates";
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
      const memberIds = Array.from(new Set(draft.memberIds));
      const managerId = draft.managerId || undefined;

      if (draft.templateId !== null) {
        const result = await applyTemplate.mutateAsync({
          templateId: draft.templateId,
          input: {
            name: draft.name,
            description: draft.description || undefined,
            managerId,
            startDate: draft.startDate || undefined,
            endDate: draft.endDate || undefined,
          },
        });
        projectId = result.projectId;

        if (memberIds.length > 0) {
          const results = await Promise.allSettled(
            memberIds.map((userId) =>
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
          managerId,
          clientId: draft.clientId || undefined,
          memberIds: memberIds.length > 0 ? memberIds : undefined,
          startDate: draft.startDate || undefined,
          endDate: draft.endDate || undefined,
          modules: draft.modules,
          projectType: draft.projectType || undefined,
          workflow: draft.workflow || undefined,
          features: draft.features,
        });
        projectId = project.id;
      }

      toast.success("Project created");
      onSuccess();
      router.push(`/build/${projectId}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsProvisioning(false);
    }
  }

  return { provision, isProvisioning };
}
