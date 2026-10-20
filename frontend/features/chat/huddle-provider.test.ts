import { Users, Video } from "lucide-react";
import { huddleProviderPresentation } from "./huddle-provider";

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

  it("keeps the neutral label for legacy huddles that have no provider", () => {
    expect(huddleProviderPresentation(null).joinLabel).toBe("Join meeting");
  });
});
