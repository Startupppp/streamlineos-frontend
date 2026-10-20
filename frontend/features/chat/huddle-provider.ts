import { Users, Video, type LucideIcon } from "lucide-react";
import type { Huddle } from "@/types/chat";

interface HuddleProviderPresentation {
  joinLabel: string;
  Icon: LucideIcon;
}

export function huddleProviderPresentation(provider: Huddle["meetingProvider"]): HuddleProviderPresentation {
  if (provider === "google_meet") return { joinLabel: "Join Google Meet", Icon: Video };
  if (provider === "microsoft_teams") return { joinLabel: "Join Microsoft Teams", Icon: Users };
  return { joinLabel: "Join meeting", Icon: Video };
}
