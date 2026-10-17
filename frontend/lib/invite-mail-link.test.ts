import {
  buildInvitationAcceptPath,
  extractInvitationTokenFromMail,
} from "./invite-mail-link";
import { INVITE_ACCESS_PRESETS } from "@/features/directory/users/invite-module-access";
import { resolveInvitationLanding } from "@/lib/invitation-landing";
import type { AccessResponse } from "@/types/access";

function access(overrides: Partial<AccessResponse> = {}): AccessResponse {
  return {
    scopes: {},
    isOrgOwner: false,
    canManageOrganizationMembership: false,
    modules: {},
    ...overrides,
  };
}

describe("invite create → captured mail → accept → role landing", () => {
  it("rejects mail with no invitation link (bad path)", () => {
    expect(extractInvitationTokenFromMail("No link here")).toBeNull();
  });

  it("rejects an empty token path (bad path)", () => {
    expect(extractInvitationTokenFromMail("https://app.test/invitation/")).toBeNull();
  });

  it("Build Member preset carries build module MEMBER standing", () => {
    const preset = INVITE_ACCESS_PRESETS.find((p) => p.id === "build-member");
    expect(preset?.access).toEqual([
      { moduleKey: "build", standing: "MEMBER" },
    ]);
  });

  it("extracts the token from captured HTML mail and builds the accept path", () => {
    const html =
      '<p>Join us</p><a href="https://app.test/invitation/tok_build_member_1">Accept</a>';
    const token = extractInvitationTokenFromMail(html);
    expect(token).toBe("tok_build_member_1");
    expect(buildInvitationAcceptPath(token!)).toBe(
      "/invitation/tok_build_member_1",
    );
  });

  it("lands a Build Member on /build after accept (happy path)", () => {
    expect(
      resolveInvitationLanding(
        access({
          modules: { build: true },
          scopes: { "build:view": "own" },
        }),
        null,
      ),
    ).toBe("/build");
  });
});
