"use client";

import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CheckIcon, XIcon } from "@animateicons/react/lucide";
import { useUpdateMyProfile } from "@/hooks/api/auth";
import { useConfirmedSessionClaimsRefresh } from "@/hooks/common/use-confirmed-session-claims-refresh";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import {
  DISPLAY_NAME_MAX_LENGTH,
  settingsDisplayNameSchema,
  type SettingsDisplayNameValues,
} from "./settings-profile-schema";

interface SettingsEditNameFormProps {
  name: string;
  onClose: () => void;
}

export function SettingsEditNameForm({ name, onClose }: SettingsEditNameFormProps) {
  const beginClaimsRefresh = useConfirmedSessionClaimsRefresh();
  const updateProfile = useUpdateMyProfile();
  const form = useForm<SettingsDisplayNameValues>({
    resolver: zodResolver(settingsDisplayNameSchema),
    defaultValues: { name },
  });

  const watchedName = form.watch("name");
  const nameError = form.formState.errors.name?.message;
  const isSaving = updateProfile.isPending;

  const handleSave = form.handleSubmit((values) => {
    const nextName = values.name.trim();
    const claimsRun = beginClaimsRefresh();
    updateProfile.mutate(
      { name: nextName },
      {
        onSuccess: async () => {
          const confirmed = await claimsRun.confirmOrWarn({ name: nextName });
          if (confirmed) toast.success("Name updated");
          onClose();
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleSave();
      }
      if (e.key === "Escape") onClose();
    },
    [handleSave, onClose],
  );

  const handleCancel = useCallback(() => onClose(), [onClose]);

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        <Input
          id="display-name"
          {...form.register("name")}
          onKeyDown={handleKeyDown}
          placeholder="Your full name"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          autoFocus
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "display-name-error" : undefined}
          className="flex-1"
        />
        <LoadingButton
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSave}
          disabled={!watchedName.trim()}
          isPending={isSaving}
          aria-label="Save name"
        >
          {!isSaving && <CheckIcon size={14} />}
        </LoadingButton>
        <AnimatedIconButton
          icon={XIcon}
          iconSize={14}
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          onClick={handleCancel}
          aria-label="Cancel editing"
        />
      </div>
      {nameError ? (
        <p id="display-name-error" className="text-dense font-medium text-destructive">
          {nameError}
        </p>
      ) : null}
    </div>
  );
}
