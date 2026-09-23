import { grantContract } from "./portal-access-schema";

const mutationGrantPayload = {
  projectClientGrantId: "grant-abc-123",
  organizationId: "org-xyz",
  portalMembershipId: "mem-001",
  partyContactId: "contact-001",
  projectId: 7,
  canViewMilestones: true,
  canViewTasks: false,
  canViewAttachments: false,
  canViewComments: true,
  canSubmitChangeRequests: false,
  status: "ACTIVE" as const,
  expiresAt: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

describe("grantContract — mutation response shape (POST /grants, PATCH, POST /revoke)", () => {
  it("parses a realistic mutation response that has no contactFirstName or contactLastName", () => {
    const result = grantContract.safeParse(mutationGrantPayload);
    expect(result.success).toBe(true);
  });

  it("transforms absent contactFirstName to null so downstream code receiving string|null is satisfied", () => {
    const result = grantContract.parse(mutationGrantPayload);
    expect(result.contactFirstName).toBeNull();
    expect(result.contactLastName).toBeNull();
  });

  it("passes through contactFirstName when the server includes it (list-decorated endpoint)", () => {
    const withContacts = {
      ...mutationGrantPayload,
      contactFirstName: "Alice",
      contactLastName: "Smith",
    };
    const result = grantContract.parse(withContacts);
    expect(result.contactFirstName).toBe("Alice");
    expect(result.contactLastName).toBe("Smith");
  });

  it("passes through a null contactFirstName when explicitly present and null", () => {
    const withNullContacts = {
      ...mutationGrantPayload,
      contactFirstName: null,
      contactLastName: null,
    };
    const result = grantContract.parse(withNullContacts);
    expect(result.contactFirstName).toBeNull();
    expect(result.contactLastName).toBeNull();
  });

  it("rejects a payload with an unknown status value", () => {
    const badStatus = { ...mutationGrantPayload, status: "DELETED" };
    const result = grantContract.safeParse(badStatus);
    expect(result.success).toBe(false);
  });

  it("rejects a payload missing a required field", () => {
    const { projectClientGrantId: _omit, ...rest } = mutationGrantPayload;
    const result = grantContract.safeParse(rest);
    expect(result.success).toBe(false);
  });
});
