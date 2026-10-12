"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { Copy, Globe, GlobeLock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useIntakeSettings,
  usePublishIntake,
  useUnpublishIntake,
} from "@/hooks/api/build/intake-settings";

interface IntakeShareControlsProps {
  projectId: number;
}

export function IntakeShareControls({ projectId }: IntakeShareControlsProps) {
  const canManage = useCan("build:workspace:manage");
  const { data: settings } = useIntakeSettings(projectId);
  const publish = usePublishIntake(projectId);
  const unpublish = useUnpublishIntake(projectId);
  const token = settings?.intakeToken ?? null;
  const isPublished = (settings?.intakePublishedAt ?? null) !== null;

  const handleCopy = useCallback(() => {
    if (token === null) return;
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    void navigator.clipboard.writeText(`${origin}/intake/t/${token}`).then(
      () => toast.success("Intake link copied"),
      (error: unknown) => toast.error(getErrorMessage(error)),
    );
  }, [token]);

  const handlePublish = useCallback(() => {
    publish.mutate(undefined, {
      onSuccess: () => toast.success("Intake published"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [publish]);

  const handleUnpublish = useCallback(() => {
    unpublish.mutate(undefined, {
      onSuccess: () => toast.success("Intake unpublished"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [unpublish]);

  return (
    <>
      {token === null ? null : (
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-1" />
          <span className="max-[380px]:hidden">Copy intake link</span>
          <span className="min-[381px]:hidden">Copy link</span>
        </Button>
      )}
      {canManage && !isPublished ? (
        <LoadingButton
          variant="outline"
          size="sm"
          onClick={handlePublish}
          isPending={publish.isPending}
          loadingText="Publishing"
        >
          <Globe className="h-4 w-4 mr-1" />
          Publish intake
        </LoadingButton>
      ) : null}
      {canManage && isPublished ? (
        <ConfirmDialog
          destructive
          title="Unpublish public intake?"
          description="The public intake address stops accepting requests and its link is rotated, so every link already shared stops working for good. Publishing again issues a new address."
          confirmLabel="Stop accepting requests"
          isPending={unpublish.isPending}
          onConfirm={handleUnpublish}
          trigger={
            <Button variant="outline" size="sm">
              <GlobeLock className="h-4 w-4 mr-1" />
              Unpublish intake
            </Button>
          }
        />
      ) : null}
    </>
  );
}
