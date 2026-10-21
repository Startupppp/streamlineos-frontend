import { Users, Video, type LucideIcon } from "lucide-react";
import type { Huddle } from "@/types/chat";

interface HuddleProviderPresentation {
  joinLabel: string;
  Icon: LucideIcon;
}

export function huddleProviderPresentation(provider: Huddle["meetingProvider"]): HuddleProviderPresentation {
  if (provider === "google_meet") return { joinLabel: "Join Google Meet", Icon: Video };
  if (provider === "microsoft_teams") return { joinLabel: "Join Microsoft Teams", Icon: Users };
  return { joinLabel: "Join external meeting", Icon: Video };
}

export const EXTERNAL_MEETING_LABEL = "External meeting";

const PROVIDER_ACCOUNT_NAME = { google_meet: "Google", microsoft_teams: "Microsoft" } as const;

export function huddleConnectCopy(
  kind: "connect" | "reconnect",
  provider: Huddle["meetingProvider"],
): { message: string; actionLabel: string } {
  if (kind === "connect") {
    return {
      message: "Connect Google or Microsoft calendar to start a meeting",
      actionLabel: "Connect calendar",
    };
  }
  if (provider === null) {
    return {
      message: "Reconnect your calendar to start a meeting",
      actionLabel: "Reconnect calendar",
    };
  }
  const name = PROVIDER_ACCOUNT_NAME[provider];
  return { message: `Reconnect ${name} to start a meeting`, actionLabel: `Reconnect ${name}` };
}
