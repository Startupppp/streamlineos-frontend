import { z } from "zod";
import { cursorPageContract } from "@/hooks/api/cursor-page-schema";
import { invitationsResponseContract } from "@/hooks/api/users/extended-users-schema";

/**
 * Proves that the old offset-pagination shape that the frontend used to expect
 * is rejected by the current contract, while the real backend cursor-page shape
 * is accepted. The old shape is defined inline so the test remains valid as a
 * historical record even after the production schema is corrected.
 *
 * Customer impact before repair: the backend returns a cursor page but the old
 * contract expected `pagination.page/total/totalPages`. Zod parses the response
 * against the contract and on mismatch the apiClient logs a warning and returns
 * `undefined` data, which the hook coerces to `data: []`. The panel renders an
 * empty state indistinguishable from "no invitations yet" — no error, no retry,
 * silent data loss.
 */

const oldOffsetPaginationContract = z.object({
  data: z.array(z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    invitedBy: z.string(),
    expiresAt: z.string(),
    acceptedAt: z.string().nullable(),
    createdAt: z.string(),
    status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "EXPIRED", "REVOKED"]),
    revokedAt: z.string().nullable(),
    deliveryFailed: z.boolean(),
  })),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

const backendCursorPageFixture = {
  data: [
    {
      id: "inv-1",
      email: "alice@example.com",
      role: "MEMBER",
      expiresAt: "2026-10-01T00:00:00.000Z",
      acceptedAt: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      status: "PENDING",
      revokedAt: null,
      declinedAt: null,
      deliveryFailed: false,
    },
  ],
  pagination: {
    limit: 20,
    hasMore: false,
    nextCursor: null,
  },
};

describe("invitation list contract fixture", () => {
  it("old offset-pagination contract REJECTS the real backend cursor-page shape", () => {
    const result = oldOffsetPaginationContract.safeParse(backendCursorPageFixture);
    expect(result.success).toBe(false);
  });

  it("current cursor-page contract ACCEPTS the real backend shape", () => {
    const result = invitationsResponseContract.safeParse(backendCursorPageFixture);
    expect(result.success).toBe(true);
  });

  it("current contract REJECTS an item that still has invitedBy but no declinedAt", () => {
    const oldItemShape = {
      data: [
        {
          id: "inv-1",
          email: "alice@example.com",
          role: "MEMBER",
          invitedBy: "bob@example.com",
          expiresAt: "2026-10-01T00:00:00.000Z",
          acceptedAt: null,
          createdAt: "2026-09-01T00:00:00.000Z",
          status: "PENDING",
          revokedAt: null,
          deliveryFailed: false,
        },
      ],
      pagination: { limit: 20, hasMore: false, nextCursor: null },
    };
    const result = invitationsResponseContract.safeParse(oldItemShape);
    expect(result.success).toBe(false);
  });

  it("current contract ACCEPTS a declined invitation with declinedAt set", () => {
    const fixture = {
      data: [
        {
          id: "inv-2",
          email: "bob@example.com",
          role: "MEMBER",
          expiresAt: "2026-10-01T00:00:00.000Z",
          acceptedAt: null,
          createdAt: "2026-09-01T00:00:00.000Z",
          status: "DECLINED",
          revokedAt: null,
          declinedAt: "2026-09-05T12:00:00.000Z",
          deliveryFailed: false,
        },
      ],
      pagination: { limit: 20, hasMore: true, nextCursor: "cursor-abc" },
    };
    const result = invitationsResponseContract.safeParse(fixture);
    expect(result.success).toBe(true);
  });

  it("cursor-page helper produces a consistent schema independently", () => {
    const itemSchema = z.object({
      id: z.string(),
      email: z.string(),
      role: z.string(),
      expiresAt: z.string(),
      acceptedAt: z.string().nullable(),
      createdAt: z.string(),
      status: z.string(),
      revokedAt: z.string().nullable(),
      declinedAt: z.string().nullable(),
      deliveryFailed: z.boolean(),
    });
    const contract = cursorPageContract(itemSchema);
    const result = contract.safeParse(backendCursorPageFixture);
    expect(result.success).toBe(true);
  });
});
