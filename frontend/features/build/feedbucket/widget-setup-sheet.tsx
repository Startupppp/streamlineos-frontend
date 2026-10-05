"use client";

import { RefreshCcw } from "lucide-react";
import { CopyIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
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
import type { FeedbucketWidget } from "@/types/feedbucket";
import { WidgetAssigneeRules } from "./widget-assignee-rules";
import { useWidgetSetup } from "./use-widget-setup";

interface WidgetSetupSheetProps {
  open: boolean;
  widget: FeedbucketWidget;
  onClose: () => void;
}

export function WidgetSetupSheet({ open, widget, onClose }: WidgetSetupSheetProps) {
  const {
    confirmRotate,
    setConfirmRotate,
    projectOptions,
    members,
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
  } = useWidgetSetup(widget, open);

  function handleOpenChange(v: boolean) {
    if (!v) onClose();
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
