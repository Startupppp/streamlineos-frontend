"use client";

import { useCallback, useRef, useState } from "react";
import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

export interface OrganizationSettingsForm<
  TValues extends FieldValues,
  TPayload,
> {
  form: UseFormReturn<TValues, unknown, TValues>;
  isEditing: boolean;
  isSaving: boolean;
  handleEdit: () => void;
  handleCancel: () => void;
  save: (payload: TPayload) => void;
}

interface UseOrganizationSettingsFormArgs<
  TValues extends FieldValues,
  TPayload,
  TData,
> {
  resolver: Resolver<TValues, unknown, TValues>;
  serverValues: TValues;
  mutation: UseMutationResult<TData, Error, TPayload, unknown>;
  successMessage: string;
}

export function useOrganizationSettingsForm<
  TValues extends FieldValues,
  TPayload,
  TData,
>({
  resolver,
  serverValues,
  mutation,
  successMessage,
}: UseOrganizationSettingsFormArgs<
  TValues,
  TPayload,
  TData
>): OrganizationSettingsForm<TValues, TPayload> {
  const [isEditing, setIsEditing] = useState(false);
  const inFlightRef = useRef(false);

  // `keepDirtyValues` is what stops a background refetch overwriting an active edit.
  const form = useForm<TValues, unknown, TValues>({
    resolver,
    values: serverValues,
    resetOptions: { keepDirtyValues: true, keepErrors: true },
  });

  const { reset, getValues } = form;
  const { mutate, isPending } = mutation;

  const handleEdit = useCallback(() => {
    reset(serverValues);
    setIsEditing(true);
  }, [reset, serverValues]);

  const handleCancel = useCallback(() => {
    reset(serverValues);
    setIsEditing(false);
  }, [reset, serverValues]);

  const save = useCallback(
    (payload: TPayload) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      mutate(payload, {
        onSuccess: () => {
          toast.success(successMessage);
          setIsEditing(false);
          reset(getValues());
        },
        onError: (error) => toast.error(getErrorMessage(error)),
        onSettled: () => {
          inFlightRef.current = false;
        },
      });
    },
    [mutate, successMessage, reset, getValues],
  );

  return { form, isEditing, isSaving: isPending, handleEdit, handleCancel, save };
}
