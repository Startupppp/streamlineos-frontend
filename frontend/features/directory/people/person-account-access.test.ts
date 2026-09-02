import type { OrganizationPerson } from "@/types/directory/people";
import {
  getPersonAccessBadge,
  getPersonAccessBadgeTone,
  getPersonAccountAccess,
  getInvitationManagementHref,
} from "./person-account-access";

function person(
  overrides: Partial<OrganizationPerson> = {},
): OrganizationPerson {
  return {
    organizationPersonId: "person-1",
    organizationId: "org-1",
    userId: null,
    organizationMembershipId: null,
    firstName: "Jane",
    lastName: "Doe",
    displayName: null,
    preferredName: null,
    workEmail: "jane@example.com",
    personalEmail: null,
    phone: null,
    whatsappNumber: null,
    avatarUrl: null,
    timezone: null,
    languageCode: null,
    linkedinUrl: null,
    githubUrl: null,
    bio: null,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("person account access", () => {
  it("prefers a durable member link over cached invitation state", () => {
    const value = person({
      userId: "user-1",
      accountAccess: {
        state: "INVITED",
        invitationId: "invite-1",
        invitationStatus: "PENDING",
        email: "jane@example.com",
        role: "MEMBER",
        expiresAt: "2026-01-08T00:00:00.000Z",
      },
    });

    expect(getPersonAccountAccess(value)).toEqual({ state: "MEMBER" });
    expect(getPersonAccessBadge(value)).toBe("Member linked");
    expect(getPersonAccessBadgeTone(value)).toBe("success");
  });

  it("treats a membership without a loaded user id as linked", () => {
    const value = person({
      userId: null,
      organizationMembershipId: 42,
      accountAccess: { state: "NONE" },
    });

    expect(getPersonAccountAccess(value)).toEqual({ state: "MEMBER" });
    expect(getPersonAccessBadge(value)).toBe("Member linked");
  });

  it("shows pending and expired invitations instead of directory-only", () => {
    const pending = person({
      accountAccess: {
        state: "INVITED",
        invitationId: "invite-1",
        invitationStatus: "PENDING",
        email: "jane@example.com",
        role: "MEMBER",
        expiresAt: "2026-01-08T00:00:00.000Z",
      },
    });
    const expired = person({
      accountAccess: {
        ...pending.accountAccess!,
        state: "INVITED",
        invitationStatus: "EXPIRED",
      },
    });

    expect(getPersonAccessBadge(pending)).toBe("Invitation pending");
    expect(getPersonAccessBadge(expired)).toBe("Invitation expired");
    expect(getPersonAccessBadgeTone(pending)).toBe("warning");
    expect(getPersonAccessBadgeTone(expired)).toBe("danger");
  });

  it("links invitation management to the matching invitation and status", () => {
    const value = person({
      accountAccess: {
        state: "INVITED",
        invitationId: "invite-1",
        invitationStatus: "EXPIRED",
        email: "jane+contractor@example.com",
        role: "MEMBER",
        expiresAt: "2026-01-08T00:00:00.000Z",
      },
    });

    expect(getInvitationManagementHref(getPersonAccountAccess(value))).toBe(
      "/settings/users?view=invitations&q=jane%2Bcontractor%40example.com&status=expired",
    );
  });

  it("keeps directory-only people neutral and does not create a manage link", () => {
    const value = person();
    const access = getPersonAccountAccess(value);

    expect(access).toEqual({ state: "NONE" });
    expect(getPersonAccessBadge(value)).toBe("Directory only");
    expect(getPersonAccessBadgeTone(value)).toBe("neutral");
    expect(getInvitationManagementHref(access)).toBeNull();
  });
});
