"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { buildFeedbucketEmbedSnippet } from "@/lib/feedbucket";
import {
  useRotateFeedbucketWidgetKey,
  useUpdateFeedbucketWidget,
} from "@/hooks/api/feedbucket";
import { useProjects } from "@/hooks/api/build/projects";
import { useBuildOrgMembers } from "@/hooks/api/build/build-org-members";
import type { FeedbucketWidget } from "@/types/feedbucket";
import type { ComboboxOption } from "@/components/ui/combobox";

export function useWidgetSetup(widget: FeedbucketWidget, open: boolean) {
  const [confirmRotate, setConfirmRotate] = useState(false);
  const rotateKey = useRotateFeedbucketWidgetKey();
  const updateWidget = useUpdateFeedbucketWidget();

  const projectsQuery = useProjects(undefined, { enabled: open && !widget.projectId });
  const { buildMembersQuery, members: orgMembers } = useBuildOrgMembers({
    enabled: open,
  });

  const projectOptions = useMemo<ComboboxOption[]>(() => {
    if (!projectsQuery.data) return [];
    return projectsQuery.data.data.map((p) => ({ value: String(p.id), label: p.name }));
  }, [projectsQuery.data]);

  const members = useMemo(
    () => buildMembersQuery.data?.data ?? [],
    [buildMembersQuery.data],
  );
  const membershipIdToUserId = useMemo(
    () =>
      new Map(
        orgMembers.map((member) => [member.membershipId, member.userId]),
      ),
    [orgMembers],
  );

  const defaultAssigneeUserId = useMemo(() => {
    if (!widget.defaultAssigneeMembershipId) return "";
    return membershipIdToUserId.get(widget.defaultAssigneeMembershipId) ?? "";
  }, [widget.defaultAssigneeMembershipId, membershipIdToUserId]);

  const snippet = buildFeedbucketEmbedSnippet({ publicKey: widget.publicKey });

  async function handleCopySnippet() {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success("Embed snippet copied");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleCopyPublicKey() {
    try {
      await navigator.clipboard.writeText(widget.publicKey);
      toast.success("Public key copied");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  function handleOpenRotate() {
    setConfirmRotate(true);
  }

  async function handleConfirmRotate() {
    try {
      await rotateKey.mutateAsync(widget.id);
      toast.success("Widget key rotated");
      setConfirmRotate(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleToggleAiAssist(enabled: boolean) {
    try {
      await updateWidget.mutateAsync({
        widgetId: widget.id,
        input: { aiAssistEnabled: enabled },
      });
      toast.success(enabled ? "AI assist enabled" : "AI assist disabled");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleToggleAutoCreate(enabled: boolean) {
    try {
      await updateWidget.mutateAsync({
        widgetId: widget.id,
        input: { autoCreateTicket: enabled },
      });
      toast.success(enabled ? "Auto-create ticket enabled" : "Auto-create ticket disabled");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDefaultProjectChange(value: string) {
    const defaultProjectId = value ? Number(value) : null;
    try {
      await updateWidget.mutateAsync({
        widgetId: widget.id,
        input: { defaultProjectId },
      });
      toast.success(defaultProjectId ? "Default project updated" : "Default project cleared");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  async function handleDefaultAssigneeChange(userId: string) {
    try {
      await updateWidget.mutateAsync({
        widgetId: widget.id,
        input: { defaultAssigneeId: userId || null },
      });
      toast.success(userId ? "Default assignee updated" : "Default assignee cleared");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return {
    confirmRotate,
    setConfirmRotate,
    projectOptions,
    members,
    membershipIdToUserId,
    defaultAssigneeUserId,
    snippet,
    rotateKey,
    updateWidget,
    handleCopySnippet,
    handleCopyPublicKey,
    handleOpenRotate,
    handleConfirmRotate,
    handleToggleAiAssist,
    handleToggleAutoCreate,
    handleDefaultProjectChange,
    handleDefaultAssigneeChange,
  };
}
