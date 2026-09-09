"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EntityFormDialog } from "@/components/shared";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useDeleteNurtureSequence,
  useUpdateNurtureSequence,
} from "@/hooks/api/crm/nurture";
import type { NurtureSequenceSummary } from "@/types/crm/nurture";
import {
  nurtureSequenceSchema,
  type NurtureSequenceFormValues,
} from "./nurture-sequence-schema";

interface NurtureSequenceActionsProps {
  sequence: NurtureSequenceSummary;
}

/**
 * The three things that can be done to a cadence as a whole.
 *
 * `draft` is not offered as a destination: a sequence that has been active has
 * enrolments behind it, and describing it as never having run would lose that.
 * Pausing is the way to stop it — and it stops the enrolments already inside,
 * which is why the confirmation says so rather than calling it a toggle.
 */
export function NurtureSequenceActions({ sequence }: NurtureSequenceActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);

  const update = useUpdateNurtureSequence();
  const remove = useDeleteNurtureSequence();

  const isRunning = sequence.status === "active";
  const canActivate = sequence.stepCount > 0;

  const handleEdit = (values: NurtureSequenceFormValues) => {
    update.mutate(
      {
        nurtureSequenceId: sequence.nurtureSequenceId,
        name: values.name,
        description: values.description.length > 0 ? values.description : null,
      },
      {
        onSuccess: () => {
          toast.success("Sequence updated");
          setEditOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const handleActivate = () => {
    update.mutate(
      { nurtureSequenceId: sequence.nurtureSequenceId, status: "active" },
      {
        onSuccess: () => toast.success("Sequence turned on"),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const handlePause = () => {
    update.mutate(
      { nurtureSequenceId: sequence.nurtureSequenceId, status: "paused" },
      {
        onSuccess: () => {
          toast.success("Sequence paused");
          setPauseOpen(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  };

  const handleDelete = () => {
    remove.mutate(sequence.nurtureSequenceId, {
      onSuccess: (result) => {
        toast.success(
          result.exitedEnrollments > 0
            ? `Sequence deleted, and ${result.exitedEnrollments} enrolment${result.exitedEnrollments === 1 ? "" : "s"} released`
            : "Sequence deleted",
        );
        router.push("/crm/autonomy/nurture");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1 sm:flex-none"
        onClick={() => setEditOpen(true)}
      >
        Edit details
      </Button>

      <ConfirmDialog
        trigger={
          <Button type="button" variant="outline" size="sm" className="flex-1 sm:flex-none">
            Delete
          </Button>
        }
        title="Delete this sequence?"
        description="Everybody still in it is released immediately rather than at their next step, so they can be nurtured from somewhere else. Nothing already sent is undone."
        confirmLabel="Delete sequence"
        destructive
        isPending={remove.isPending}
        onConfirm={handleDelete}
      />

      {isRunning ? (
        <>
          <Button
            type="button"
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setPauseOpen(true)}
          >
            Pause
          </Button>
          <ConfirmDialog
            open={pauseOpen}
            onOpenChange={setPauseOpen}
            title="Pause this sequence?"
            description="Pausing stops the enrolments already inside it, not only new ones — each ends at its next step rather than freezing. They would have to be enrolled again."
            confirmLabel="Pause it"
            isPending={update.isPending}
            keepOpenOnConfirm
            onConfirm={handlePause}
          />
        </>
      ) : (
        <LoadingButton
          type="button"
          size="sm"
          className="flex-1 sm:flex-none"
          isPending={update.isPending}
          disabled={!canActivate}
          onClick={handleActivate}
        >
          {canActivate ? "Turn on" : "Add a step to turn on"}
        </LoadingButton>
      )}

      <EntityFormDialog<NurtureSequenceFormValues>
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit sequence"
        resolver={zodResolver(nurtureSequenceSchema)}
        defaultValues={{ name: sequence.name, description: sequence.description ?? "" }}
        onSubmit={handleEdit}
        isSubmitting={update.isPending}
        submitLabel="Save"
        resetOnOpen
      >
        {(form) => (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} autoComplete="off" />
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
                  <FormLabel>What it is for</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </EntityFormDialog>
    </div>
  );
}
