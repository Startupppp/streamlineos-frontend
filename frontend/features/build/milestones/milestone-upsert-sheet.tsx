"use client";

import { useCallback, useMemo, useState } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  milestoneFormSchema,
  type MilestoneFormValues,
} from "@/features/build/milestones/milestone-schema";
import { toMilestoneStatus } from "@/features/build/milestones/milestone-status";
import { AppDialog } from "@/components/shared/app-dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MemberPicker } from "@/components/members/member-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { getApiErrorCode, isApiError } from "@/lib/api-envelope";
import { TicketConflictDialog } from "@/features/build/ticket-details/ticket-conflict-dialog";
import type { TicketConflictFieldDiff } from "@/features/build/ticket-details/ticket-conflict-diff";
import {
  useCreateMilestone,
  useUpdateMilestone,
  type ProjectMilestone,
} from "@/hooks/api/build/milestones";
import { useOrgMembers } from "@/hooks/api/organization";
import { getUserDisplayName } from "@/lib/person-display";

const CONFLICT_EMPTY = "Not set";

function displayConflictValue(value: unknown): string {
  if (value === null || value === undefined || value === "")
    return CONFLICT_EMPTY;
  return String(value);
}

function buildMilestoneConflictDiffs(
  values: MilestoneFormValues,
  baseline: ProjectMilestone,
  ownerLabel: (membershipId: number | null) => string,
): TicketConflictFieldDiff[] {
  const pairs: Array<{
    key: string;
    label: string;
    server: unknown;
    pending: unknown;
  }> = [
    {
      key: "name",
      label: "Name",
      server: baseline.name,
      pending: values.name.trim(),
    },
    {
      key: "description",
      label: "Description",
      server: baseline.description ?? null,
      pending: values.description?.trim() || null,
    },
    {
      key: "targetDate",
      label: "Target date",
      server: baseline.targetDate ?? null,
      pending: values.targetDate || null,
    },
    {
      key: "status",
      label: "Status",
      server: toMilestoneStatus(baseline.status),
      pending: values.status,
    },
    {
      key: "ownerMembershipId",
      label: "Owner",
      server: ownerLabel(baseline.ownerMembershipId ?? null),
      pending: ownerLabel(values.ownerMembershipId ?? null),
    },
  ];
  return pairs
    .filter(
      ({ server, pending }) => String(server ?? "") !== String(pending ?? ""),
    )
    .map(({ key, label, server, pending }) => ({
      key,
      label,
      serverValue: displayConflictValue(server),
      pendingValue: displayConflictValue(pending),
    }));
}

interface MilestoneUpsertSheetProps {
  projectId: number;
  milestone?: ProjectMilestone;
  onClose: () => void;
}

export function MilestoneUpsertSheet({
  projectId,
  milestone,
  onClose,
}: MilestoneUpsertSheetProps) {
  const isEdit = !!milestone;
  const create = useCreateMilestone(projectId);
  const update = useUpdateMilestone(projectId);
  const isPending = create.isPending || update.isPending;

  const [conflictFields, setConflictFields] = useState<
    TicketConflictFieldDiff[] | null
  >(null);
  const { data: membersPage } = useOrgMembers(1, 100);
  const members = useMemo(() => membersPage?.data ?? [], [membersPage]);

  const candidates = useMemo(
    () =>
      members.map((m) => ({
        id: m.userId,
        name: m.name,
        email: m.email,
        image: m.image,
      })),
    [members],
  );
  const userIdByMembershipId = useMemo(
    () => new Map(members.map((m) => [m.membershipId, m.userId])),
    [members],
  );
  const membershipIdByUserId = useMemo(
    () => new Map(members.map((m) => [m.userId, m.membershipId])),
    [members],
  );

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      name: milestone?.name ?? "",
      description: milestone?.description ?? "",
      targetDate: milestone?.targetDate ?? "",
      status: toMilestoneStatus(milestone?.status),
      ownerMembershipId: milestone?.ownerMembershipId ?? null,
    },
  });
  useRegisterDirtyState(form.formState.isDirty);

  const targetDateValue = form.watch("targetDate");

  const handleTargetDateChange = useCallback(
    (val: string) => form.setValue("targetDate", val, { shouldValidate: true }),
    [form],
  );

  const ownerLabel = useCallback(
    (membershipId: number | null) => {
      if (membershipId === null) return CONFLICT_EMPTY;
      const member = members.find((m) => m.membershipId === membershipId);
      return member ? getUserDisplayName(member) : String(membershipId);
    },
    [members],
  );

  const handleConflictDismiss = useCallback(() => setConflictFields(null), []);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  const onSubmit = useCallback(
    (values: MilestoneFormValues) => {
      const payload = {
        name: values.name,
        description: values.description?.trim() || undefined,
        targetDate: values.targetDate,
        status: values.status,
        ownerMembershipId: values.ownerMembershipId,
      };

      if (isEdit) {
        update.mutate(
          { milestoneId: milestone.id, version: milestone.version, ...payload },
          {
            onSuccess: () => {
              toast.success("Milestone updated");
              onClose();
            },
            onError: (err) => {
              if (
                isApiError(err) &&
                getApiErrorCode(err) === "PROJECTS_TICKET_CONFLICT"
              ) {
                const diffs = buildMilestoneConflictDiffs(
                  values,
                  milestone,
                  ownerLabel,
                );
                if (diffs.length > 0) {
                  setConflictFields(diffs);
                } else {
                  toast.warning(
                    "This milestone was modified by another user. Your changes were not saved.",
                  );
                }
                return;
              }
              toast.error(getErrorMessage(err));
            },
          },
        );
      } else {
        create.mutate(payload, {
          onSuccess: () => {
            toast.success("Milestone created");
            onClose();
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [isEdit, milestone, create, update, onClose, ownerLabel],
  );

  return (
    <>
      <AppDialog
        open
        onOpenChange={handleOpenChange}
        title={isEdit ? "Edit Milestone" : "New Milestone"}
        description={
          isEdit
            ? "Update the milestone details and keep its delivery status current."
            : "Create a checkpoint with an owner, target date, and delivery status."
        }
        footer={
          <div className="grid w-full grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              form="milestone-form"
              isPending={isPending}
              loadingText="Saving…"
            >
              {isEdit ? "Save Changes" : "Create Milestone"}
            </LoadingButton>
          </div>
        }
      >
        <Form {...form}>
          <form
            id="milestone-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. MVP Launch" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Optional description…"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownerMembershipId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <FormControl>
                    <MemberPicker
                      candidates={candidates}
                      value={
                        field.value != null
                          ? (userIdByMembershipId.get(field.value) ??
                            undefined)
                          : undefined
                      }
                      onChange={(userId) =>
                        field.onChange(
                          userId != null
                            ? (membershipIdByUserId.get(userId) ?? null)
                            : null,
                        )
                      }
                      allowUnassigned
                      placeholder="Unassigned"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="targetDate"
                render={() => (
                  <FormItem>
                    <FormLabel>Target Date *</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={targetDateValue}
                        onChange={handleTargetDateChange}
                        placeholder="Pick a date"
                        className="text-sm"
                        disablePast
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="ACHIEVED">Achieved</SelectItem>
                        <SelectItem value="MISSED">Missed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </AppDialog>
      <TicketConflictDialog
        open={conflictFields !== null}
        fields={conflictFields ?? []}
        onKeepMine={handleConflictDismiss}
        onDiscard={handleConflictDismiss}
      />
    </>
  );
}
