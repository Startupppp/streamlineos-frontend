"use client";

import { useState, useCallback, type MouseEvent } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import {
  useSendTestWebhook,
  useRotateWebhookSecret,
  type ProjectWebhook,
} from "@/hooks/api/build/webhooks";

interface UseWebhookCardOptions {
  webhook: ProjectWebhook;
  projectId: number;
  expandedProp?: boolean;
  onExpandedChange?: (webhookId: number, expanded: boolean) => void;
  onToggle?: (
    w: Pick<ProjectWebhook, "id" | "version">,
    isActive: boolean,
  ) => void;
  onDelete: (id: number) => void;
  onEdit?: (w: ProjectWebhook) => void;
  onSelectedChange?: (webhookId: number, selected: boolean) => void;
}

export function useWebhookCard({
  webhook,
  projectId,
  expandedProp,
  onExpandedChange,
  onToggle,
  onEdit,
  onSelectedChange,
}: UseWebhookCardOptions) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const sendTest = useSendTestWebhook(projectId);
  const rotateSecret = useRotateWebhookSecret(projectId);
  const { iconRef: sendIconRef, hoverHandlers: sendHoverHandlers } =
    useAnimatedIcon();
  const { iconRef: chevronIconRef, hoverHandlers: chevronHoverHandlers } =
    useAnimatedIcon();

  const expanded = expandedProp ?? internalExpanded;

  const handleToggleExpanded = useCallback(() => {
    if (onExpandedChange) {
      onExpandedChange(webhook.id, !expanded);
      return;
    }
    setInternalExpanded((v) => !v);
  }, [onExpandedChange, webhook.id, expanded]);

  const handleSendTest = useCallback(() => {
    sendTest.mutate(webhook.id, {
      onSuccess: (result) => {
        if (result.success) {
          toast.success("Test delivery succeeded");
        } else {
          toast.error(
            `Test delivery failed (HTTP ${result.responseCode ?? "—"})`,
          );
        }
        if (onExpandedChange) onExpandedChange(webhook.id, true);
        else setInternalExpanded(true);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [sendTest, webhook.id, onExpandedChange]);

  const handleActiveToggle = useCallback(
    (checked: boolean) => {
      onToggle?.({ id: webhook.id, version: webhook.version }, checked);
    },
    [onToggle, webhook.id, webhook.version],
  );

  const handleSelectedChange = useCallback(
    (checked: boolean | "indeterminate") => {
      onSelectedChange?.(webhook.id, checked === true);
    },
    [onSelectedChange, webhook.id],
  );

  const handleContextMenu = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setMenuOpen(true);
    },
    [],
  );

  const handleCopyUrl = useCallback(() => {
    void navigator.clipboard.writeText(webhook.url);
    toast.success("URL copied");
    setMenuOpen(false);
  }, [webhook.url]);

  const handleRotateSecret = useCallback(() => {
    setMenuOpen(false);
    rotateSecret.mutate(webhook.id, {
      onSuccess: (result) => {
        setRevealedSecret(result.secret);
        setSecretCopied(false);
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [rotateSecret, webhook.id]);

  const handleCopySecret = useCallback(() => {
    if (!revealedSecret) return;
    void navigator.clipboard.writeText(revealedSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  }, [revealedSecret]);

  const handleDismissSecret = useCallback(() => setRevealedSecret(null), []);

  const handleEditFromMenu = useCallback(() => {
    onEdit?.(webhook);
    setMenuOpen(false);
  }, [onEdit, webhook]);

  const handleToggleFromMenu = useCallback(() => {
    onToggle?.(
      { id: webhook.id, version: webhook.version },
      !webhook.isActive,
    );
    setMenuOpen(false);
  }, [onToggle, webhook]);

  return {
    expanded,
    menuOpen,
    setMenuOpen,
    revealedSecret,
    secretCopied,
    sendTest,
    rotateSecret,
    sendIconRef,
    sendHoverHandlers,
    chevronIconRef,
    chevronHoverHandlers,
    handleToggleExpanded,
    handleSendTest,
    handleActiveToggle,
    handleSelectedChange,
    handleContextMenu,
    handleCopyUrl,
    handleRotateSecret,
    handleCopySecret,
    handleDismissSecret,
    handleEditFromMenu,
    handleToggleFromMenu,
  };
}
