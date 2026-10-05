"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon } from "@animateicons/react/lucide";
import { AiFieldTrigger, AiInlinePreview } from "@/components/ai";
import { TicketCreateProperties } from "./ticket-create-properties";
import { TicketDialogTitleField } from "./ticket-dialog-title-field";
import { TicketDialogDescriptionSection } from "./ticket-dialog-description-section";
import { TicketDialogFooter } from "./ticket-dialog-footer";
import { useCan } from "@/hooks/api/access";
import { useCreateTicketDialogState } from "./use-create-ticket-dialog-state";

interface CreateTicketDialogProps {
  projectId?: number;
  defaultStatus?: string;
  defaultCycleId?: number | null;
  variant?: "default" | "fab";
  hideTrigger?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function CreateTicketDialog({
  ...props
}: CreateTicketDialogProps) {
  const canCreate = useCan("build:tickets:create");
  if (!canCreate) return null;
  return <CreateTicketDialogContent {...props} />;
}

function CreateTicketDialogContent({
  projectId: lockedProjectId,
  defaultStatus,
  defaultCycleId,
  variant = "default",
  hideTrigger = false,
  externalOpen,
  onExternalOpenChange,
}: CreateTicketDialogProps) {
  const {
    projectLocked,
    selectedProjectId,
    resolvedOpen,
    form,
    files,
    relatedLinks,
    setRelatedLinks,
    isUploading,
    isPending,
    properties,
    handlePropertiesChange,
    createMore,
    titleRef,
    projectStatuses,
    members,
    labels,
    cycles,
    projects,
    projectsLoading,
    showLinksEditor,
    descriptionEditorKey,
    titleInlineSession,
    descriptionInlineSession,
    fieldsInlineSession,
    duplicates,
    previewUrls,
    fileError,
    createTicketAi,
    handleOpenTrigger,
    handleOpenChange,
    handleProjectChange,
    handleShowLinksEditor,
    handleCreateMoreChange,
    handleFileChange,
    handleRemoveFileWithPreview,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFormSubmit,
    canSubmit,
    projectSelectValue,
    projectTriggerLabel,
    currentProjectKey,
  } = useCreateTicketDialogState({
    lockedProjectId,
    defaultStatus,
    defaultCycleId,
    externalOpen,
    onExternalOpenChange,
  });

  return (
    <>
      {!hideTrigger &&
        (variant === "fab" ? (
          <AnimatedIconButton
            size="lg"
            icon={PlusIcon}
            iconSize={24}
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Create Issue"
            onClick={handleOpenTrigger}
          />
        ) : (
          <AnimatedIconButton icon={PlusIcon} iconSize={16} iconClassName="mr-2" onClick={handleOpenTrigger}>
            Create Issue
          </AnimatedIconButton>
        ))}

      <Dialog open={resolvedOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-auto max-h-[min(720px,calc(100dvh-100px))] flex-col gap-0 overflow-hidden p-0 md:flex md:h-auto md:max-h-[min(720px,calc(100dvh-100px))] md:max-w-2xl md:overflow-hidden md:sm:max-w-2xl">
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 pb-3 pt-4">
            <div className="flex min-w-0 items-center gap-2 pr-8">
              <Select
                value={projectSelectValue}
                onValueChange={handleProjectChange}
                disabled={projectLocked || projectsLoading || isPending || isUploading}
              >
                <SelectTrigger
                  aria-label="Select project"
                  className="w-auto max-w-[220px] gap-1.5 border-border bg-card px-2 font-medium shadow-sm disabled:opacity-100"
                >
                  <SelectValue placeholder={projectTriggerLabel} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="mr-1.5 font-mono text-micro text-muted-foreground">
                        {p.key}
                      </span>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DialogTitle className="text-sm font-medium text-muted-foreground">
                New Issue
              </DialogTitle>
              <DialogDescription className="sr-only">
                Create a ticket and set its project, status, priority, assignee,
                estimate, labels, and cycle.
              </DialogDescription>
            </div>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={handleFormSubmit}
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <TicketDialogTitleField
                control={form.control}
                titleRef={titleRef}
                canUseAI={createTicketAi.canUseAI}
                titleTriggerProps={createTicketAi.titleTrigger}
                titleInlineSession={titleInlineSession}
                duplicates={duplicates}
              />

              <TicketDialogDescriptionSection
                control={form.control}
                descriptionEditorKey={descriptionEditorKey}
                canUseAI={createTicketAi.canUseAI}
                descriptionTriggerProps={createTicketAi.descriptionTrigger}
                descriptionInlineSession={descriptionInlineSession}
                files={files}
                previewUrls={previewUrls}
                onRemoveFile={handleRemoveFileWithPreview}
                showLinksEditor={showLinksEditor}
                relatedLinks={relatedLinks}
                onRelatedLinksChange={setRelatedLinks}
                selectedProjectId={selectedProjectId}
                projectKey={currentProjectKey}
                fileError={fileError}
              />

              <div className="relative z-10 shrink-0 border-t border-border bg-background px-5 py-3">
                {fieldsInlineSession ? (
                  <AiInlinePreview
                    session={fieldsInlineSession}
                    applyLabel="Apply suggestions"
                    previewMode="fields"
                    className="mb-3"
                  />
                ) : null}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <TicketCreateProperties
                      value={properties}
                      onChange={handlePropertiesChange}
                      projectStatuses={projectStatuses}
                      members={members}
                      labels={labels}
                      cycles={cycles}
                    />
                  </div>
                  {createTicketAi.canUseAI ? (
                    <AiFieldTrigger
                      {...createTicketAi.fieldsTrigger}
                      className="mt-0.5 shrink-0"
                    />
                  ) : null}
                </div>
              </div>

              <TicketDialogFooter
                files={files}
                onFileChange={handleFileChange}
                onShowLinksEditor={handleShowLinksEditor}
                createMore={createMore}
                onCreateMoreChange={handleCreateMoreChange}
                isPending={isPending}
                isUploading={isUploading}
                canSubmit={canSubmit}
              />
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
