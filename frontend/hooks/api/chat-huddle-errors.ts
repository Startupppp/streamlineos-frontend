import { toast } from "sonner";
import { isApiError } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { isRecord } from "@/lib/is-record";
import { huddleConnectCopy, providerDisplayName } from "@/features/chat/huddle-provider";
import type { Huddle } from "@/types/chat";
import type { HuddleAlternative } from "@/hooks/api/chat-schema";

const DEFAULT_CONNECT_PATH = "/calendar?accounts=1";
const FREE_PLAN_COPY =
  "Group huddles are not included in your plan. Upgrade to start huddles in channels. Direct messages can still use huddles.";

type HuddleToastAction = { label: string; onClick: () => void };

function huddleErrorCode(error: unknown): string | undefined {
  return isApiError(error) ? error.code : undefined;
}

export function isHuddleNotJoined(error: unknown): boolean {
  return huddleErrorCode(error) === "HUDDLE_NOT_JOINED";
}

function detailString(error: unknown, key: string): string | undefined {
  if (!isApiError(error) || !isRecord(error.details)) return undefined;
  const value = error.details[key];
  return typeof value === "string" ? value : undefined;
}

function appPath(value: string | undefined): string | undefined {
  return value !== undefined && value.startsWith("/") && !value.startsWith("//") ? value : undefined;
}

function navigateAction(label: string, path: string): HuddleToastAction {
  return { label, onClick: () => window.location.assign(path) };
}

function connectAction(label: string, error: unknown): HuddleToastAction {
  return navigateAction(label, appPath(detailString(error, "connectPath")) ?? DEFAULT_CONNECT_PATH);
}

function detailProvider(error: unknown): Huddle["meetingProvider"] {
  const value = detailString(error, "provider");
  return value === "google_meet" || value === "microsoft_teams" ? value : null;
}

function detailAlternatives(error: unknown): HuddleAlternative[] {
  if (!isApiError(error) || !isRecord(error.details)) return [];
  const { alternatives } = error.details;
  if (!Array.isArray(alternatives)) return [];
  return alternatives.filter(
    (a): a is HuddleAlternative =>
      isRecord(a) &&
      typeof a.connectionId === "number" &&
      (a.provider === "google_meet" || a.provider === "microsoft_teams") &&
      typeof a.label === "string",
  );
}

export function reportHuddleStartError(
  error: unknown,
  retry: () => void,
  retryWithConnection?: (connectionId: number) => void,
): void {
  const code = huddleErrorCode(error);
  if (code === "HUDDLE_NO_CONNECTION" || code === "HUDDLE_RECONNECT") {
    const copy = huddleConnectCopy(
      code === "HUDDLE_NO_CONNECTION" ? "connect" : "reconnect",
      detailProvider(error),
    );
    toast.error(copy.message, {
      duration: Number.POSITIVE_INFINITY,
      action: connectAction(copy.actionLabel, error),
    });
    return;
  }
  if (code === "HUDDLE_TEAMS_UNSUPPORTED") {
    const alternatives = detailAlternatives(error);
    const first = alternatives[0];
    if (first !== undefined && retryWithConnection !== undefined) {
      const label = `Start with ${providerDisplayName(first.provider)} instead`;
      toast.error(
        "Microsoft Teams for Business is required to start a huddle from this account.",
        {
          duration: Number.POSITIVE_INFINITY,
          action: { label, onClick: () => retryWithConnection(first.connectionId) },
        },
      );
    } else {
      toast.error(
        "Microsoft Teams for Business is required to start a huddle from this account. Connect a different calendar account.",
        { duration: Number.POSITIVE_INFINITY, action: connectAction("Connect a calendar account", error) },
      );
    }
    return;
  }
  if (code === "HUDDLE_PROVIDER_UNAVAILABLE") {
    toast.error(getErrorMessage(error), { action: { label: "Try again", onClick: retry } });
    return;
  }
  if (code === "FEATURE_NOT_AVAILABLE") {
    const upgradePath = appPath(detailString(error, "upgradePath"));
    toast.error(FREE_PLAN_COPY, upgradePath ? { action: navigateAction("View plans", upgradePath) } : undefined);
    return;
  }
  toast.error(getErrorMessage(error));
}

function invalidUserIds(error: unknown): string[] {
  if (!isApiError(error) || !isRecord(error.details)) return [];
  const ids = error.details.invalidUserIds;
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
}

function describeRejected(ids: string[], nameFor: (userId: string) => string | undefined): string {
  const names = ids.map(nameFor).filter((name): name is string => Boolean(name));
  const [first] = names;
  if (ids.length === 1) {
    return first
      ? `${first} is not a member of this channel, so they cannot be invited.`
      : "That person is not a member of this channel, so they cannot be invited.";
  }
  if (first === undefined) return `${ids.length} people are not members of this channel, so they cannot be invited.`;
  const others = ids.length - 1;
  return `${first} and ${others} ${others === 1 ? "other" : "others"} are not members of this channel, so they cannot be invited.`;
}

export function describeHuddleInviteError(
  error: unknown,
  nameFor: (userId: string) => string | undefined,
): string {
  const code = huddleErrorCode(error);
  if (code === "HUDDLE_INVITEE_NOT_MEMBER") {
    const ids = invalidUserIds(error);
    if (ids.length > 0) return describeRejected(ids, nameFor);
  }
  if (code === "FEATURE_NOT_AVAILABLE") return FREE_PLAN_COPY;
  return getErrorMessage(error);
}
