"use client";

import { useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useAgentAvailability, useSetMyAvailability } from "@/hooks/api/support/macros";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

export function AgentAvailabilityToggle() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { data: availability } = useAgentAvailability();
  const setAvailability = useSetMyAvailability();

  const isAvailable = useMemo(() => {
    const mine = availability?.find((a) => a.userId === userId);
    return mine?.isAvailable ?? true;
  }, [availability, userId]);

  const handleToggle = useCallback(() => {
    setAvailability.mutate(!isAvailable, {
      onSuccess: () => toast.success(!isAvailable ? "You're now available" : "You're now away"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [isAvailable, setAvailability]);

  if (!userId) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      onClick={handleToggle}
      disabled={setAvailability.isPending}
    >
      <span
        className={
          isAvailable
            ? "h-2 w-2 rounded-full bg-emerald-500"
            : "h-2 w-2 rounded-full bg-muted-foreground/50"
        }
      />
      {isAvailable ? "Available" : "Away"}
    </Button>
  );
}
