import { describe, it, expect, vi, beforeEach } from "vitest";

describe("writeAuditLog", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("inserts an audit log entry without throwing", async () => {
    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    vi.doMock("@/lib/db", () => ({
      db: { insert: mockInsert },
    }));
    vi.doMock("@/lib/db/schema", () => ({
      auditLogs: {},
    }));

    const { writeAuditLog } = await import("@/lib/db/audit");

    await expect(
      writeAuditLog({
        action: "auth.login_success",
        userId: "user-123",
        orgId: "org-456",
        ipAddress: "127.0.0.1",
      })
    ).resolves.toBeUndefined();
  });

  it("does not throw when db insert fails (fire-and-forget)", async () => {
    vi.doMock("@/lib/db", () => ({
      db: {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockRejectedValue(new Error("DB down")),
        }),
      },
    }));
    vi.doMock("@/lib/db/schema", () => ({
      auditLogs: {},
    }));

    const { writeAuditLog } = await import("@/lib/db/audit");

    await expect(
      writeAuditLog({
        action: "lead.create",
        userId: "user-123",
      })
    ).resolves.toBeUndefined();
  });

  it("accepts optional fields without error", async () => {
    vi.doMock("@/lib/db", () => ({
      db: {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      },
    }));
    vi.doMock("@/lib/db/schema", () => ({
      auditLogs: {},
    }));

    const { writeAuditLog } = await import("@/lib/db/audit");

    await expect(
      writeAuditLog({
        action: "settings.update",
        userId: "user-abc",
        targetId: "lead-99",
        targetType: "lead",
        metadata: { key: "value" },
      })
    ).resolves.toBeUndefined();
  });
});
