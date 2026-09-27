"use client";

import { useCallback, useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { useCreateEmployeeInviteLink } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { writeToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

interface CopyInviteLinkButtonProps {
  employeeId: string;
  employeeName: string;
  className?: string;
}

export function CopyInviteLinkButton({
  employeeId,
  employeeName,
  className,
}: CopyInviteLinkButtonProps) {
  const canInvite = useCan("hr:onboarding:manage");
  const createLink = useCreateEmployeeInviteLink();
  const [manualLink, setManualLink] = useState<string | null>(null);

  const handleCopy = useCallback(() => {
    createLink.mutate(employeeId, {
      onSuccess: async (link) => {
        const expires = new Date(link.expiresAt).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
        });
        const copied = await writeToClipboard(link.inviteUrl);
        if (copied) {
          setManualLink(null);
          toast.success(`Invite link for ${employeeName} copied`, {
            description: `Single use, expires ${expires}. Any earlier link for them no longer works.`,
          });
        } else {
          setManualLink(link.inviteUrl);
          toast.info("Clipboard was blocked. Copy the link from the field below.");
        }
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [createLink, employeeId, employeeName]);

  if (!canInvite) return null;

  return (
    <span className="inline-flex min-w-0 flex-col items-start">
    <LoadingButton
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      isPending={createLink.isPending}
      loadingText="Creating…"
      onClick={handleCopy}
      aria-label={`Copy invite link for ${employeeName}`}
    >
      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
      Copy invite link
    </LoadingButton>
    {manualLink ? (
      <label className="mt-2 flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
        Invite link
        <input
          readOnly
          value={manualLink}
          aria-label={`Invite link for ${employeeName}`}
          className="h-8 w-full min-w-0 rounded-md border border-input bg-card px-2 text-xs text-foreground"
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
    ) : null}
    </span>
  );
}
