"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isApiError } from "@/lib/api-envelope";
import { createApprovalInputSchema } from "@/hooks/api/build/approvals-schema";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestApprovalSchema, type RequestApprovalValues } from "./approvals-schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import type { BuildApprovalsCreateApprovalBody } from "@/contracts/build-contracts.generated";
import type { ApprovalEntityType } from "@/types/projects";
import { useEntityItems, type SelectionState } from "./use-entity-items";
import { RequestApprovalFormBody } from "./request-approval-form-body";
import { entityTypeTitlePrefix } from "./approvals-constants";

interface RequestApprovalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: BuildApprovalsCreateApprovalBody) => void | Promise<unknown>;
  isPending?: boolean;
  projectId: number;
  currentUserId?: string;
  defaultEntityType?: ApprovalEntityType;
}

export function RequestApprovalSheet({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  projectId,
  currentUserId,
  defaultEntityType,
}: RequestApprovalSheetProps) {
  const form = useForm<RequestApprovalValues>({
    resolver: zodResolver(requestApprovalSchema),
    defaultValues: {
      entityType: defaultEntityType ?? "task",
      entityId: "",
      title: "",
      approverId: "",
      reason: "",
      dueAt: "",
      level: "1",
    },
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  const entityType = form.watch("entityType");
  const entityId = form.watch("entityId");
  const context = JSON.stringify([
    open,
    projectId,
    currentUserId,
    defaultEntityType,
    entityType,
  ]);
  const committed = useRef<object | null>(null);
  const [selection, setSelection] = useState<SelectionState>({
    context,
    task: null,
    error: null,
    blocked: false,
  });
  if (selection.context !== context)
    setSelection({ context, task: null, error: null, blocked: false });
  useLayoutEffect(() => {
    committed.current = {};
    return () => {
      committed.current = null;
    };
  }, [context]);

  const { items: entityItems, isFetching: entityFetching } = useEntityItems(
    open ? projectId : 0,
    entityType,
  );

  useEffect(() => {
    if (open) {
      form.reset({
        entityType: defaultEntityType ?? "task",
        entityId: "",
        title: "",
        approverId: "",
        reason: "",
        dueAt: "",
        level: "1",
      });
    }
  }, [open, projectId, currentUserId, defaultEntityType, form]);

  useEffect(() => {
    form.setValue("entityId", "");
    if (form.formState.dirtyFields.title) return;
    form.setValue("title", "");
  }, [entityType, form]);

  useEffect(() => {
    if (entityType !== "budget") return;
    form.setValue("entityId", String(projectId));
  }, [entityType, projectId, form]);

  useEffect(() => {
    if (!entityId) return;
    if (form.formState.dirtyFields.title) return;
    const item = entityItems.find((o) => o.value === entityId);
    if (!item) return;
    const prefix = entityTypeTitlePrefix(entityType);
    form.setValue("title", `${prefix}: ${item.rawTitle}`);
  }, [entityId, entityItems, entityType, form]);

  async function handleSubmit(values: RequestApprovalValues) {
    const owner = committed.current;
    if (
      !open ||
      !owner ||
      isPending ||
      selection.blocked ||
      selection.context !== context
    )
      return;
    if (
      values.entityType === "task" &&
      (!selection.task ||
        selection.task.id !== values.entityId ||
        selection.task.version === undefined)
    ) {
      setSelection({
        ...selection,
        error: new Error(
          "Select a ticket with a current version before requesting approval.",
        ),
      });
      return;
    }
    const input = {
      entityType: values.entityType,
      entityId: parseInt(values.entityId, 10),
      title: values.title.trim(),
      approverId: values.approverId,
      ...(values.reason?.trim() ? { reason: values.reason.trim() } : {}),
      ...(values.dueAt ? { dueAt: values.dueAt } : {}),
      ...(values.level ? { level: parseInt(values.level, 10) } : {}),
      ...(values.entityType === "task"
        ? { expectedArtifactVersion: selection.task?.version }
        : {}),
    };
    try {
      await onSubmit(createApprovalInputSchema.parse(input));
    } catch (error: unknown) {
      if (committed.current === owner)
        setSelection((current) =>
          current.context === context && current.task === selection.task
            ? {
                ...current,
                error,
                blocked: isApiError(error) && error.status === 409,
              }
            : current,
        );
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next)
      form.reset({
        entityType: defaultEntityType ?? "task",
        entityId: "",
        title: "",
        approverId: "",
        reason: "",
        dueAt: "",
        level: "1",
      });
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Request Approval</SheetTitle>
          <SheetDescription>Submit an item for approval review.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="px-6 py-5 space-y-4">
              <RequestApprovalFormBody
                form={form}
                entityType={entityType}
                entityItems={entityItems}
                entityFetching={entityFetching}
                selection={selection}
                setSelection={setSelection}
                context={context}
                currentUserId={currentUserId}
                projectId={projectId}
              />
            </SheetBody>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  size="sm"
                  disabled={selection.blocked}
                  isPending={Boolean(isPending || form.formState.isSubmitting)}
                  loadingText="Submitting…"
                >
                  Submit Request
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
