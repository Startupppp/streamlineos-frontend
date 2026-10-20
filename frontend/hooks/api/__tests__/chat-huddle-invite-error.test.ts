import { ApiError } from "@/lib/api-envelope";
import { describeHuddleInviteError } from "@/hooks/api/chat-huddle-errors";

describe("describeHuddleInviteError", () => {
  it("names the rejected people from details.invalidUserIds for HUDDLE_INVITEE_NOT_MEMBER", () => {
    const error = new ApiError("Invitees must be channel members", 422, "HUDDLE_INVITEE_NOT_MEMBER", {
      invalidUserIds: ["u1", "u2"],
    });
    const names = new Map([["u1", "Ada"]]);
    expect(describeHuddleInviteError(error, (id) => names.get(id))).toBe(
      "Ada and 1 other are not members of this channel, so they cannot be invited.",
    );
  });

  it("names a single rejected person", () => {
    const error = new ApiError("x", 422, "HUDDLE_INVITEE_NOT_MEMBER", { invalidUserIds: ["u1"] });
    expect(describeHuddleInviteError(error, () => "Ada")).toBe(
      "Ada is not a member of this channel, so they cannot be invited.",
    );
  });

  it("pluralises others when more than one more is rejected", () => {
    const error = new ApiError("x", 422, "HUDDLE_INVITEE_NOT_MEMBER", { invalidUserIds: ["u1", "u2", "u3"] });
    expect(describeHuddleInviteError(error, (id) => (id === "u1" ? "Ada" : undefined))).toBe(
      "Ada and 2 others are not members of this channel, so they cannot be invited.",
    );
  });

  it("falls back to a count when no name is known", () => {
    const error = new ApiError("x", 422, "HUDDLE_INVITEE_NOT_MEMBER", { invalidUserIds: ["u1", "u2"] });
    expect(describeHuddleInviteError(error, () => undefined)).toBe(
      "2 people are not members of this channel, so they cannot be invited.",
    );
  });

  it("explains the plan limit for FEATURE_NOT_AVAILABLE", () => {
    const error = new ApiError("x", 402, "FEATURE_NOT_AVAILABLE");
    expect(describeHuddleInviteError(error, () => undefined)).toMatch(/direct messages/i);
  });

  it("uses the server message otherwise", () => {
    expect(describeHuddleInviteError(new ApiError("Nope", 500), () => undefined)).toBe("Nope");
  });
});
