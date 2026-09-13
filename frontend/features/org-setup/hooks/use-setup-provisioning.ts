"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isApiError } from "@/lib/api-client";
import { CONTRACT_VIOLATION_CODE } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { useOrgSetupStatusQuery } from "@/lib/api/hooks/org";
import type { OrgSetupStatus, RecipientOutcome } from "@/lib/api/hooks/org-schema";

const POLL_INTERVAL_MS = 2_000;
const POLL_DEADLINE_MS = 90_000;

export type ProvisioningIssue = {
  title: string;
  message: string;
  reference: string | null;
  canContinue: boolean;
};

export type SetupProvisioning = {
  isReady: boolean;
  background: "pending" | "in-progress" | "completed" | "failed" | "unknown";
  issue: ProvisioningIssue | null;
  recipientOutcomes: RecipientOutcome[] | null;
  isRechecking: boolean;
  hasTimedOut: boolean;
  recheck: () => void;
};

type TerminalErrorKind = "auth" | "contract";

function issueForAuth(): ProvisioningIssue {
  return {
    title: "Session verification failed",
    message:
      "Your session could not be verified. Sign out and sign back in, then try again.",
    reference: null,
    canContinue: false,
  };
}

function issueForContract(): ProvisioningIssue {
  return {
    title: "Unexpected server response",
    message:
      "The server sent data this app does not understand. Refresh and try again — if this continues, contact support.",
    reference: null,
    canContinue: false,
  };
}

function issueForNetwork(): ProvisioningIssue {
  return {
    title: "Connection issue",
    message:
      "We could not reach the server to check your setup status. Check your connection and try checking again.",
    reference: null,
    canContinue: false,
  };
}

function issueForBackgroundPartial(
  correlationId: string | null,
): ProvisioningIssue {
  return {
    title: "Some optional setup steps didn't finish",
    message:
      "Your workspace is ready and you can continue. Part of the optional setup — such as the starter structure or your invitations — didn't complete and won't retry on its own. You can invite people from Settings, and support can re-run the rest.",
    reference: correlationId,
    canContinue: true,
  };
}

function issueForBackgroundDead(
  correlationId: string | null,
  canContinue: boolean,
): ProvisioningIssue {
  return {
    title: "Optional setup step did not finish",
    message: canContinue
      ? "Your workspace is ready and you can continue. The optional enrichment step failed and will not retry on its own — contact support if needed."
      : "The optional setup step failed and will not retry automatically. Contact support for assistance.",
    reference: correlationId,
    canContinue,
  };
}

function issueForBackgroundInvalid(
  correlationId: string | null,
  canContinue: boolean,
): ProvisioningIssue {
  return {
    title: "Optional setup step could not run",
    message: canContinue
      ? "Your workspace is ready and you can continue. The enrichment step received invalid instructions — contact support to have it re-run."
      : "The setup enrichment step received invalid instructions and cannot run. Contact support for assistance.",
    reference: correlationId,
    canContinue,
  };
}

function issueForBackgroundSuppressed(
  correlationId: string | null,
  canContinue: boolean,
): ProvisioningIssue {
  return {
    title: "Optional setup step was skipped",
    message: canContinue
      ? "Your workspace is ready and you can continue. The enrichment step was skipped for this organization."
      : "The setup enrichment step was skipped for this organization.",
    reference: correlationId,
    canContinue,
  };
}

function issueForTimeout(
  willRetryInBackground: boolean,
  correlationId: string | null,
): ProvisioningIssue {
  return {
    title: "Setup is taking longer than expected",
    message: willRetryInBackground
      ? "Your workspace was created and the remaining setup is still running in the background. You can continue now — it will finish on its own."
      : "Your workspace was created and setup status is taking longer than expected to confirm. You can continue now.",
    reference: correlationId,
    canContinue: true,
  };
}

function toBackground(
  provisioning: OrgSetupStatus["provisioning"],
  errorCode: OrgSetupStatus["errorCode"],
): SetupProvisioning["background"] {
  switch (provisioning) {
    case "not-started":
      return "unknown";
    case "pending":
      return "pending";
    case "in-progress":
      return "in-progress";
    case "completed":
      return "completed";
    case "failed":
      return errorCode === "SETUP_BACKGROUND_RETRYING" ? "in-progress" : "failed";
  }
}

function isTerminalData(data: OrgSetupStatus | undefined): boolean {
  if (!data) return false;
  if (data.provisioning === "completed") return true;
  if (
    data.provisioning === "failed" &&
    data.errorCode !== "SETUP_BACKGROUND_RETRYING"
  )
    return true;
  return false;
}

export function useSetupProvisioning(isStarted: boolean): SetupProvisioning {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [deadlineToken, setDeadlineToken] = useState(0);
  const [terminalError, setTerminalError] = useState<TerminalErrorKind | null>(
    null,
  );
  const seenOrgIdRef = useRef<string | undefined>(undefined);

  const { data, error, isFetching, refetch } = useOrgSetupStatusQuery({
    ...INLINE_READ_ERROR,
    enabled: isStarted && !hasTimedOut && terminalError === null,
    refetchInterval: (query) => {
      const { data: qData, error: qError } = query.state;
      if (qError) return false;
      if (isTerminalData(qData)) return false;
      return POLL_INTERVAL_MS;
    },
  });

  const isSettled = isTerminalData(data);

  useEffect(() => {
    if (!isStarted || isSettled || hasTimedOut || terminalError !== null) return;
    const timer = setTimeout(() => setHasTimedOut(true), POLL_DEADLINE_MS);
    return () => clearTimeout(timer);
  }, [isStarted, isSettled, hasTimedOut, terminalError, deadlineToken]);

  useEffect(() => {
    if (!error) return;
    if (isApiError(error) && (error.status === 401 || error.status === 403)) {
      setTerminalError("auth");
      return;
    }
    if (isApiError(error) && error.code === CONTRACT_VIOLATION_CODE) {
      setTerminalError("contract");
    }
  }, [error]);

  useEffect(() => {
    const orgId = data?.orgId;
    if (!orgId) return;
    if (seenOrgIdRef.current === undefined) {
      seenOrgIdRef.current = orgId;
      return;
    }
    if (seenOrgIdRef.current !== orgId) {
      setHasTimedOut(true);
    }
  }, [data?.orgId]);

  const recheck = useCallback(() => {
    setHasTimedOut(false);
    setTerminalError(null);
    setDeadlineToken((t) => t + 1);
    void refetch();
  }, [refetch]);

  if (!isStarted) {
    return {
      isReady: false,
      background: "unknown",
      issue: null,
      recipientOutcomes: null,
      isRechecking: false,
      hasTimedOut: false,
      recheck,
    };
  }

  if (terminalError === "auth") {
    return {
      isReady: false,
      background: "failed",
      issue: issueForAuth(),
      recipientOutcomes: null,
      isRechecking: isFetching,
      hasTimedOut,
      recheck,
    };
  }

  if (terminalError === "contract") {
    return {
      isReady: false,
      background: "failed",
      issue: issueForContract(),
      recipientOutcomes: null,
      isRechecking: isFetching,
      hasTimedOut,
      recheck,
    };
  }

  if (error) {
    return {
      isReady: data?.ready ?? false,
      background: data
        ? toBackground(data.provisioning, data.errorCode)
        : "unknown",
      issue: issueForNetwork(),
      recipientOutcomes: null,
      isRechecking: isFetching,
      hasTimedOut,
      recheck,
    };
  }

  if (!data) {
    if (hasTimedOut) {
      return {
        isReady: false,
        background: "unknown",
        issue: issueForTimeout(false, null),
        recipientOutcomes: null,
        isRechecking: isFetching,
        hasTimedOut,
        recheck,
      };
    }
    return {
      isReady: false,
      background: "unknown",
      issue: null,
      recipientOutcomes: null,
      isRechecking: isFetching,
      hasTimedOut,
      recheck,
    };
  }

  const { provisioning, errorCode, ready, correlationId, recipientOutcomes } = data;
  const background = toBackground(provisioning, errorCode);

  if (provisioning === "completed") {
    return {
      isReady: ready,
      background: "completed",
      issue:
        errorCode === "SETUP_BACKGROUND_PARTIAL"
          ? issueForBackgroundPartial(correlationId)
          : null,
      recipientOutcomes: recipientOutcomes ?? null,
      isRechecking: false,
      hasTimedOut,
      recheck,
    };
  }

  if (provisioning === "failed") {
    switch (errorCode) {
      case "SETUP_BACKGROUND_RETRYING": {
        if (hasTimedOut) {
          return {
            isReady: ready,
            background: "in-progress",
            issue: issueForTimeout(true, correlationId),
            recipientOutcomes: null,
            isRechecking: isFetching,
            hasTimedOut,
            recheck,
          };
        }
        return {
          isReady: ready,
          background: "in-progress",
          issue: null,
          recipientOutcomes: null,
          isRechecking: isFetching,
          hasTimedOut,
          recheck,
        };
      }
      case "SETUP_BACKGROUND_DEAD":
        return {
          isReady: ready,
          background: "failed",
          issue: issueForBackgroundDead(correlationId, ready),
          recipientOutcomes: null,
          isRechecking: isFetching,
          hasTimedOut,
          recheck,
        };
      case "SETUP_BACKGROUND_INVALID":
        return {
          isReady: ready,
          background: "failed",
          issue: issueForBackgroundInvalid(correlationId, ready),
          recipientOutcomes: null,
          isRechecking: isFetching,
          hasTimedOut,
          recheck,
        };
      case "SETUP_BACKGROUND_SUPPRESSED":
        return {
          isReady: ready,
          background: "failed",
          issue: issueForBackgroundSuppressed(correlationId, ready),
          recipientOutcomes: null,
          isRechecking: isFetching,
          hasTimedOut,
          recheck,
        };
      default:
        return {
          isReady: ready,
          background: "failed",
          issue: issueForBackgroundDead(correlationId, ready),
          recipientOutcomes: null,
          isRechecking: isFetching,
          hasTimedOut,
          recheck,
        };
    }
  }

  if (hasTimedOut) {
    return {
      isReady: ready,
      background,
      issue: issueForTimeout(false, correlationId),
      recipientOutcomes: null,
      isRechecking: isFetching,
      hasTimedOut,
      recheck,
    };
  }

  return {
    isReady: ready,
    background,
    issue: null,
    recipientOutcomes: null,
    isRechecking: isFetching,
    hasTimedOut,
    recheck,
  };
}
