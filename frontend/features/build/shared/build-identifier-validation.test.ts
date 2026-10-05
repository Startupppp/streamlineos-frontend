import { z } from "zod";

const PROJECT_KEY_REGEX = /^[A-Z][A-Z0-9]{1,9}$/;
const TICKET_KEY_REGEX = /^[A-Z][A-Z0-9]{1,9}-\d+$/;

const projectKeySchema = z
  .string()
  .min(2, "Project key must be at least 2 characters")
  .max(10, "Project key must be at most 10 characters")
  .regex(PROJECT_KEY_REGEX, "Project key must start with a letter and contain only uppercase letters and digits");

const ticketKeySchema = z
  .string()
  .regex(TICKET_KEY_REGEX, "Ticket key must be in the format PROJ-123");

const userIdSchema = z
  .string()
  .uuid("User ID must be a valid UUID");

describe("Project key validation", () => {
  it("accepts a valid 2-character project key", () => {
    expect(projectKeySchema.safeParse("AB").success).toBe(true);
  });

  it("accepts a valid 10-character project key", () => {
    expect(projectKeySchema.safeParse("ABCDEFGHIJ").success).toBe(true);
  });

  it("rejects a project key with lowercase letters", () => {
    expect(projectKeySchema.safeParse("abc").success).toBe(false);
  });

  it("rejects a single-character project key", () => {
    expect(projectKeySchema.safeParse("A").success).toBe(false);
  });

  it("rejects a project key longer than 10 characters", () => {
    expect(projectKeySchema.safeParse("ABCDEFGHIJK").success).toBe(false);
  });

  it("rejects a project key containing special characters", () => {
    expect(projectKeySchema.safeParse("AB-CD").success).toBe(false);
  });

  it("rejects a project key starting with a digit", () => {
    expect(projectKeySchema.safeParse("1ABC").success).toBe(false);
  });

  it("accepts a key with digits after the initial letter", () => {
    expect(projectKeySchema.safeParse("AB123").success).toBe(true);
  });
});

describe("Ticket key validation", () => {
  it("accepts a valid ticket key PROJ-1", () => {
    expect(ticketKeySchema.safeParse("PROJ-1").success).toBe(true);
  });

  it("accepts a ticket key with a large number", () => {
    expect(ticketKeySchema.safeParse("AB-9999").success).toBe(true);
  });

  it("rejects a ticket key without the number part", () => {
    expect(ticketKeySchema.safeParse("PROJ").success).toBe(false);
  });

  it("rejects a ticket key with a non-numeric suffix", () => {
    expect(ticketKeySchema.safeParse("PROJ-abc").success).toBe(false);
  });

  it("rejects a ticket key starting with lowercase", () => {
    expect(ticketKeySchema.safeParse("proj-1").success).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(ticketKeySchema.safeParse("").success).toBe(false);
  });
});

describe("User ID validation", () => {
  it("accepts a valid UUID v4", () => {
    expect(userIdSchema.safeParse("550e8400-e29b-41d4-a716-446655440000").success).toBe(true);
  });

  it("rejects an integer-as-string user ID", () => {
    expect(userIdSchema.safeParse("12345").success).toBe(false);
  });

  it("rejects a UUID with wrong format", () => {
    expect(userIdSchema.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("Date/timezone validation", () => {
  const isoDueDateSchema = z
    .string()
    .datetime({ offset: true, message: "Due date must be an ISO-8601 string with timezone offset" });

  it("accepts an ISO-8601 date with UTC offset", () => {
    expect(isoDueDateSchema.safeParse("2026-12-31T00:00:00Z").success).toBe(true);
  });

  it("accepts an ISO-8601 date with positive offset", () => {
    expect(isoDueDateSchema.safeParse("2026-12-31T12:00:00+05:30").success).toBe(true);
  });

  it("accepts an ISO-8601 date with negative offset", () => {
    expect(isoDueDateSchema.safeParse("2026-12-31T08:00:00-08:00").success).toBe(true);
  });

  it("rejects a date-only string without time or offset", () => {
    expect(isoDueDateSchema.safeParse("2026-12-31").success).toBe(false);
  });

  it("rejects a date string with no timezone offset", () => {
    expect(isoDueDateSchema.safeParse("2026-12-31T00:00:00").success).toBe(false);
  });

  it("rejects a completely invalid date string", () => {
    expect(isoDueDateSchema.safeParse("not-a-date").success).toBe(false);
  });
});
