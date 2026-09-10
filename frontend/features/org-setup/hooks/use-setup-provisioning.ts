"use client";

import { useCallback, useEffect, useState } from "react";
import { useOrgSetupStatusQuery } from "@/lib/api/hooks/org";

const POLL_INTERVAL_MS = 2_000;
const POLL_DEADLINE_MS = 90_000;

const FAILED_TITLE = "Setup didn't finish cleanly";
const FAILED_FALLBACK =
  "Your workspace was created, but a background setup step reported an error.";
const TIMEOUT_TITLE = "Setup is taking longer than expected";
const TIMEOUT_MESSAGE =
  "Your workspace was created and the remaining setup is still running in the background. You can continue now and it will finish on its own.";

export type ProvisioningIssue = { title: string; message: string };

type ProvisioningPhase =
  | "idle"
  | "working"
  | "completed"
  | "failed"
  | "timed-out";

type SetupProvisioning = {
  phase: ProvisioningPhase;
  issue: ProvisioningIssue | null;
  isRechecking: boolean;
  recheck: () => void;
};

export function useSetupProvisioning(isStarted: boolean): SetupProvisioning {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [deadlineToken, setDeadlineToken] = useState(0);

  const { data, isFetching, refetch } = useOrgSetupStatusQuery({
    enabled: isStarted && !hasTimedOut,
    refetchInterval: (query) => {
      const state = query.state.data?.provisioning;
      if (state === "completed" || state === "failed") return false;
      return POLL_INTERVAL_MS;
    },
  });

  const provisioning = data?.provisioning;
  const isSettled = provisioning === "completed" || provisioning === "failed";

  useEffect(() => {
    if (!isStarted || isSettled) return;
    const timer = setTimeout(() => setHasTimedOut(true), POLL_DEADLINE_MS);
    return () => clearTimeout(timer);
  }, [isStarted, isSettled, deadlineToken]);

  const recheck = useCallback(() => {
    setHasTimedOut(false);
    setDeadlineToken((token) => token + 1);
    void refetch();
  }, [refetch]);

  if (!isStarted)
    return { phase: "idle", issue: null, isRechecking: false, recheck };

  if (provisioning === "completed")
    return { phase: "completed", issue: null, isRechecking: false, recheck };

  if (provisioning === "failed")
    return {
      phase: "failed",
      issue: {
        title: FAILED_TITLE,
        message: data?.lastError ?? FAILED_FALLBACK,
      },
      isRechecking: isFetching,
      recheck,
    };

  if (hasTimedOut)
    return {
      phase: "timed-out",
      issue: { title: TIMEOUT_TITLE, message: TIMEOUT_MESSAGE },
      isRechecking: isFetching,
      recheck,
    };

  return { phase: "working", issue: null, isRechecking: isFetching, recheck };
}
