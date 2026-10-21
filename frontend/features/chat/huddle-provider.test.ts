import { Users, Video } from "lucide-react";
import { EXTERNAL_MEETING_LABEL, huddleConnectCopy, huddleProviderPresentation } from "./huddle-provider";

describe("huddleProviderPresentation", () => {
  it("names Google Meet so people know where the join link goes", () => {
    expect(huddleProviderPresentation("google_meet")).toEqual({ joinLabel: "Join Google Meet", Icon: Video });
  });

  it("names Microsoft Teams with its own icon", () => {
    expect(huddleProviderPresentation("microsoft_teams")).toEqual({
      joinLabel: "Join Microsoft Teams",
      Icon: Users,
    });
  });

  it("labels a huddle with no provider as an external meeting", () => {
    expect(huddleProviderPresentation(null).joinLabel).toBe("Join external meeting");
    expect(EXTERNAL_MEETING_LABEL).toBe("External meeting");
  });

  it("words connect and reconnect states by provider", () => {
    expect(huddleConnectCopy("connect", null).message).toBe("Connect Google or Microsoft calendar to start a meeting");
    expect(huddleConnectCopy("reconnect", "google_meet").message).toBe("Reconnect Google to start a meeting");
    expect(huddleConnectCopy("reconnect", "microsoft_teams").message).toBe("Reconnect Microsoft to start a meeting");
  });
});
