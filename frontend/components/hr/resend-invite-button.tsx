"use client";

import { Send } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import { useResendEmployeeInvite } from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { describeUnsentInvite } from "@/components/hr/invite-delivery";
import { cn } from "@/lib/utils";

interface ResendInviteButtonProps {
  employeeId: string;
  employeeName: string;
  className?: string;
}

export function ResendInviteButton({ employeeId, employeeName, className }: ResendInviteButtonProps) {
  const canResend = useCan("hr:onboarding:manage");
  const resendInvite = useResendEmployeeInvite();

  if (!canResend) return null;

  function handleResend() {
    resendInvite.mutate(employeeId, {
      onSuccess: (result) => {
        const unsent = describeUnsentInvite(result.invite);
        if (unsent) toast.warning(unsent);
        else toast.success(`Invitation sent to ${employeeName}`);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <LoadingButton
      type="button"
      variant="outline"
      size="sm"
      className={cn("gap-1.5", className)}
      isPending={resendInvite.isPending}
      loadingText="Sending…"
      onClick={handleResend}
      aria-label={`Resend invite to ${employeeName}`}
    >
      <Send className="h-3.5 w-3.5" aria-hidden="true" />
      Resend invite
    </LoadingButton>
  );
}
