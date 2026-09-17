"use client";

import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { usePresenceMap } from "@/hooks/api/chat-core-read";
import { useSetPresenceStatus } from "@/hooks/api/chat-core-mutations-b";
import { getErrorMessage } from "@/lib/get-error-message";
import type { PresenceStatus } from "@/lib/presence";

interface PresenceSelection {
  status: PresenceStatus;
  selectStatus: (next: PresenceStatus) => void;
  isPending: boolean;
}

export function usePresenceSelection(): PresenceSelection {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const presenceMap = usePresenceMap();
  const setPresenceStatus = useSetPresenceStatus();
  const [pendingStatus, setPendingStatus] = useState<PresenceStatus | null>(null);

  const serverStatus = userId ? presenceMap.get(userId) : undefined;

  if (pendingStatus !== null && serverStatus === pendingStatus) setPendingStatus(null);

  const selectStatus = useCallback(
    (next: PresenceStatus) => {
      setPendingStatus(next);
      setPresenceStatus.mutate(next, {
        onError: (error) => {
          setPendingStatus(null);
          toast.error(getErrorMessage(error));
        },
      });
    },
    [setPresenceStatus],
  );

  return {
    status: pendingStatus ?? serverStatus ?? "ONLINE",
    selectStatus,
    isPending: setPresenceStatus.isPending,
  };
}
