"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useOnlineStatus } from "./use-online-status";

export const INBOX_OFFLINE_MESSAGE =
  "You're offline — reconnect to update your inbox.";

export interface RunWhenOnline {
  isOnline: boolean;
  runWhenOnline: (run: () => void) => void;
}

export function useRunWhenOnline(): RunWhenOnline {
  const isOnline = useOnlineStatus();

  const runWhenOnline = useCallback(
    (run: () => void): void => {
      if (!isOnline) {
        toast.error(INBOX_OFFLINE_MESSAGE);
        return;
      }
      run();
    },
    [isOnline],
  );

  return { isOnline, runWhenOnline };
}
