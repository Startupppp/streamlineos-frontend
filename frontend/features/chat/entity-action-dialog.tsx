"use client";

import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Form } from "@/components/ui/form";
import { MemberPicker } from "@/components/members/member-picker";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useEntityActionOptions,
  useSubmitEntityAction,
  type EntityAction,
  type EntityActionInputSpec,
  type EntityReferenceInput,
} from "@/hooks/api/chat";

/**
 * One dialog for every action on every referenced record. It renders from the
 * action's declaration, so adding an action to any module needs no work here —
 * which is the whole reason the declaration carries its input kinds and, for a
 * person, where the eligible people come from.
 */

interface EntityActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: number;
  reference: EntityReferenceInput;
  action: EntityAction;
}

/** `assigneeId` → `Assignee id`. The declaration carries no per-input label. */
function humanize(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function buildSchema(inputs: EntityActionInputSpec[]) {
  return z.object(
    Object.fromEntries(
      inputs.map((input) => [
        input.name,
        input.required
          ? z.string().trim().min(1, `${humanize(input.name)} is required`)
          : z.string(),
      ]),
    ),
  );
}

function PersonField({
  channelId,
  input,
  value,
  onChange,
}: {
  channelId: number;
  input: EntityActionInputSpec;
  value: string;
  onChange: (next: string) => void;
}) {
  const { data: options = [] } = useEntityActionOptions(
    channelId,
    input.options?.from,
  );
  const candidates = useMemo(
    () =>
      options.map((option) => ({
        id: option.value,
        name: option.label,
        firstName: null,
        lastName: null,
        email: "",
        image: option.imageUrl ?? null,
      })),
    [options],
  );

  const handleChange = useCallback(
    (userId: string | null) => onChange(userId ?? ""),
    [onChange],
  );

  return (
    <MemberPicker
      candidates={candidates}
      value={value || undefined}
      onChange={handleChange}
      placeholder={`Select ${humanize(input.name).toLowerCase()}…`}
    />
  );
}

export function EntityActionDialog({
  open,
  onOpenChange,
  channelId,
  reference,
  action,
}: EntityActionDialogProps) {
  const submit = useSubmitEntityAction();
  const schema = useMemo(() => buildSchema(action.inputs), [action.inputs]);
  const defaults = useMemo(
    () => Object.fromEntries(action.inputs.map((input) => [input.name, ""])),
    [action.inputs],
  );

  const form = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const { reset } = form;
  useEffect(() => {
    if (open) reset(defaults);
  }, [open, reset, defaults]);

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  async function handleSubmit(values: Record<string, string>) {
    try {
      await submit.mutateAsync({
        channelId,
        reference,
        actionId: action.id,
        input: values,
      });
      toast.success(`${action.label} done`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{action.label}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {action.inputs.map((input) => (
              <div key={input.name} className="space-y-2">
                <Label htmlFor={`entity-action-${input.name}`}>
                  {humanize(input.name)}
                </Label>
                <Controller
                  control={form.control}
                  name={input.name}
                  render={({ field }) => {
                    if (input.kind === "user")
                      return (
                        <PersonField
                          channelId={channelId}
                          input={input}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      );
                    if (input.kind === "date")
                      return (
                        <DatePicker
                          id={`entity-action-${input.name}`}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      );
                    if (input.kind === "choice")
                      return (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger id={`entity-action-${input.name}`}>
                            <SelectValue placeholder="Select…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(input.choices ?? []).map((choice) => (
                              <SelectItem key={choice} value={choice}>
                                {choice}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    return (
                      <Input
                        id={`entity-action-${input.name}`}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    );
                  }}
                />
                {form.formState.errors[input.name] ? (
                  <p className="text-label text-destructive">
                    {String(form.formState.errors[input.name]?.message ?? "")}
                  </p>
                ) : null}
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                isPending={submit.isPending}
                loadingText="Saving…"
              >
                {action.label}
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
