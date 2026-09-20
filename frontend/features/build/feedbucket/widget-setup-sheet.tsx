"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { RefreshCcw } from "lucide-react";
import { CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import type { ComboboxOption } from "@/components/ui/combobox";
import { UserCombobox } from "@/components/ui/user-combobox";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TruncatedText } from "@/components/ui/truncated-text";
import { TEXT_BODY, TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { buildFeedbucketEmbedSnippet } from "@/lib/feedbucket";
import {
  useRotateFeedbucketWidgetKey,
  useUpdateFeedbucketWidget,
} from "@/hooks/api/feedbucket";
import { useProjects } from "@/hooks/api/build";
import { useOrgMembers } from "@/hooks/api/organization";
import type { FeedbucketWidget } from "@/types/feedbucket";
import { WidgetAssigneeRules } from "./widget-assignee-rules";

interface WidgetSetupSheetProps {
  open: boolean;
  widget: FeedbucketWidget;
  onClose: () => void;
}

export function WidgetSetupSheet({ open, widget, onClose }: WidgetSetupSheetProps) {
  const [confirmRotate, setConfirmRotate] = useState(false);
  const rotateKey = useRotateFeedbucketWidgetKey();
  const updateWidget = useUpdateFeedbucketWidget();

  const projectsQuery = useProjects(undefined, { enabled: open && !widget.projectId });
  const membersQuery = useOrgMembers(1, 100, undefined, { enabled: open });

  const projectOptions = useMemo<ComboboxOption[]>(() => {
    if (!projectsQuery.data) return [];
    return projectsQuery.data.data.map((p) => ({ value: String(p.id), label: p.name }));
  }, [projectsQuery.data]);

  const members = useMemo(() => membersQuery.data?.data ?? [], [membersQuery.data]);

  const membershipIdToUserId = useMemo(() => {
    const map = new Map<number, string>();
    for (const m of members) map.set(m.membershipId, m.userId);
    return map;
  }, [members]);

  const defaultAssigneeUserId = useMemo(() => {
    if (!widget.defaultAssigneeMembershipId) return "";
    return membershipIdToUserId.get(widget.defaultAssigneeMembershipId) ?? "";
  }, [widget.defaultAssigneeMembershipId, membershipIdToUserId]);

  const snippet = buildFeedbucketEmbedSnippet({ publicKey: widget.publicKey });

  function handleOpenChange(v: boolean) {
    if (!v) onClose();
  }

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

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
          <SheetHeader className="px-6 py-4 border-b shrink-0 text-left gap-1">
            <SheetTitle>Widget setup</SheetTitle>
            <SheetDescription>
              Embed the feedback widget, manage the public key, and toggle AI assist.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="px-6 py-5 space-y-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <TruncatedText text={widget.name} className="text-sm font-medium" />
                <Badge
                  variant={widget.isActive ? "default" : "outline"}
                  className="shrink-0 text-xs"
                >
                  {widget.isActive ? "Active" : "Inactive"}
                </Badge>
                {widget.aiAssistEnabled ? (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    AI assist
                  </Badge>
                ) : null}
              </div>
              {widget.project?.name ? (
                <p className={cn("text-xs text-muted-foreground", TEXT_ONE_LINE)}>
                  Project: {widget.project.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className={cn("text-xs font-medium text-foreground", TEXT_ONE_LINE)}>
                Public key
              </p>
              <div className="flex items-center gap-2">
                <code
                  className={cn(
                    "min-w-0 flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground break-all",
                    TEXT_BODY,
                  )}
                >
                  {widget.publicKey}
                </code>
                <AnimatedIconButton
                  size="sm"
                  variant="outline"
                  icon={CopyIcon}
                  iconSize={14}
                  onClick={handleCopyPublicKey}
                  aria-label="Copy public key"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className={cn("text-xs font-medium text-foreground", TEXT_ONE_LINE)}>
                  Embed snippet
                </p>
                <AnimatedIconButton
                  size="sm"
                  variant="outline"
                  icon={CopyIcon}
                  iconSize={14}
                  iconClassName="mr-1.5"
                  onClick={handleCopySnippet}
                >
                  Copy
                </AnimatedIconButton>
              </div>
              <p className={cn("text-xs text-muted-foreground", TEXT_BODY)}>
                Paste this script on any page where you want the feedback widget. Uses the
                production brand domain and public API URL.
              </p>
              <pre
                className={cn(
                  "rounded-md border border-border bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground whitespace-pre-wrap break-all",
                  TEXT_BODY,
                )}
              >
                {snippet}
              </pre>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
              <div className="min-w-0 space-y-0.5">
                <p className={cn("text-sm font-medium", TEXT_ONE_LINE)}>AI assist in widget</p>
                <p className={cn("text-xs leading-relaxed text-muted-foreground", TEXT_BODY)}>
                  Let people submitting feedback draft a bug/feature with AI from their screenshot.
                  Uses your org&apos;s AI credits; rate-limited.
                </p>
              </div>
              <Switch
                id="widget-setup-ai-assist"
                checked={widget.aiAssistEnabled}
                onCheckedChange={handleToggleAiAssist}
                disabled={updateWidget.isPending}
                className="mt-0.5 shrink-0"
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-4 py-3">
              <div className="min-w-0 space-y-0.5">
                <p className={cn("text-sm font-medium", TEXT_ONE_LINE)}>Auto-create ticket</p>
                <p className={cn("text-xs leading-relaxed text-muted-foreground", TEXT_BODY)}>
                  Automatically create a ticket for every new submission received by this widget.
                </p>
              </div>
              <Switch
                id="widget-setup-auto-create"
                checked={widget.autoCreateTicket}
                onCheckedChange={handleToggleAutoCreate}
                disabled={updateWidget.isPending}
                className="mt-0.5 shrink-0"
              />
            </div>

            {!widget.projectId ? (
              <div className="rounded-lg border border-border px-4 py-3 space-y-2">
                <div className="space-y-0.5">
                  <p className={cn("text-sm font-medium", TEXT_ONE_LINE)}>Default project</p>
                  <p className={cn("text-xs leading-relaxed text-muted-foreground", TEXT_BODY)}>
                    Project used when converting submissions to tickets.
                  </p>
                </div>
                <Combobox
                  options={projectOptions}
                  value={widget.defaultProjectId ? String(widget.defaultProjectId) : ""}
                  onChange={handleDefaultProjectChange}
                  placeholder="Select project…"
                  aria-label="Default project"
                />
              </div>
            ) : null}

            <div className="rounded-lg border border-border px-4 py-3 space-y-2">
              <div className="space-y-0.5">
                <p className={cn("text-sm font-medium", TEXT_ONE_LINE)}>Default assignee</p>
                <p className={cn("text-xs leading-relaxed text-muted-foreground", TEXT_BODY)}>
                  Fallback used when no per-type assignee rule matches.
                </p>
              </div>
              <UserCombobox
                value={defaultAssigneeUserId}
                onChange={handleDefaultAssigneeChange}
                placeholder="Select assignee…"
                allowUnassigned
                disabled={updateWidget.isPending}
              />
            </div>

            <WidgetAssigneeRules widget={widget} members={members} />

            <div className="rounded-lg border border-border px-4 py-3 space-y-3">
              <div className="space-y-0.5">
                <p className={cn("text-sm font-medium", TEXT_ONE_LINE)}>Rotate public key</p>
                <p className={cn("text-xs leading-relaxed text-muted-foreground", TEXT_BODY)}>
                  Invalidates the current key immediately. Update the embed snippet on your site
                  afterward.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={handleOpenRotate}>
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                Rotate key
              </Button>
            </div>
          </SheetBody>
          <SheetFooter className="px-6 py-4 justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmRotate}
        onOpenChange={setConfirmRotate}
        title="Rotate widget key?"
        description="The old key will stop working immediately. Update the embed snippet on your site."
        confirmLabel="Rotate key"
        destructive
        isPending={rotateKey.isPending}
        onConfirm={handleConfirmRotate}
      />
    </>
  );
}
