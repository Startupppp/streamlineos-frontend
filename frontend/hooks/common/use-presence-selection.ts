"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { usePresenceCustomStatus, usePresenceMap } from "@/hooks/api/chat-core-read";
import {
  useSetPresenceStatus,
  type SetPresenceStatusInput,
} from "@/hooks/api/chat-core-mutations-b";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PresenceStatus } from "@/lib/presence";

interface PresenceSelection {
  status: PresenceStatus;
  statusMessage: string;
  statusExpiresAt: string | null;
  selectStatus: (next: SetPresenceStatusInput) => void;
  isPending: boolean;
}

interface PendingSelection {
  status: PresenceStatus;
  statusMessage: string;
}

export function usePresenceSelection(): PresenceSelection {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const presenceMap = usePresenceMap();
  const { statusMessage, statusExpiresAt } = usePresenceCustomStatus(userId);
  const setPresenceStatus = useSetPresenceStatus();
  const [pending, setPending] = useState<PendingSelection | null>(null);

  const serverStatus = userId ? presenceMap.get(userId) : undefined;
  const serverMessage = statusMessage ?? "";

  if (
    pending !== null &&
    serverStatus === pending.status &&
    serverMessage === pending.statusMessage
  )
    setPending(null);

  const selectStatus = useCallback(
    (next: SetPresenceStatusInput) => {
      setPending({ status: next.status, statusMessage: next.statusMessage ?? "" });
      setPresenceStatus.mutate(next, {
        onError: (error) => {
          setPending(null);
          toast.error(getErrorMessage(error));
        },
      });
    },
    [setPresenceStatus],
  );

  return {
    status: pending?.status ?? serverStatus ?? "ONLINE",
    statusMessage: pending?.statusMessage ?? serverMessage,
    statusExpiresAt,
    selectStatus,
    isPending: setPresenceStatus.isPending,
  };
}
