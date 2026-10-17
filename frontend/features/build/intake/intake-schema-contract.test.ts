import { z } from "zod";
import { intakeFormSchema, intakeSubmitResponseContract } from "./public-intake-schema";

const nestErrorEnvelopeSchema = z.object({
  message: z.union([z.string(), z.array(z.string())]),
  code: z.string().optional(),
  details: z.unknown().optional(),
  correlationId: z.string().optional(),
});

describe("intakeFormSchema — positive cases", () => {
  it("accepts a minimal valid submission with title only", () => {
    const result = intakeFormSchema.safeParse({ title: "My request" });
    expect(result.success).toBe(true);
  });

  it("accepts a full valid submission with all optional fields populated", () => {
    const result = intakeFormSchema.safeParse({
      title: "My request",
      description: "Details here",
      submitterName: "Jane Smith",
      submitterEmail: "jane@example.com",
      priority: "high",
      requestType: "feature",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("high");
      expect(result.data.requestType).toBe("feature");
    }
  });

  it("transforms an empty submitterEmail string to undefined", () => {
    const result = intakeFormSchema.safeParse({
      title: "Empty email",
      submitterEmail: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.submitterEmail).toBeUndefined();
    }
  });
});

describe("intakeFormSchema — negative cases", () => {
  it("rejects a submission with missing title", () => {
    const result = intakeFormSchema.safeParse({ description: "No title" });
    expect(result.success).toBe(false);
  });

  it("rejects a title that exceeds 200 characters", () => {
    const result = intakeFormSchema.safeParse({ title: "a".repeat(201) });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority value not in the enum", () => {
    const result = intakeFormSchema.safeParse({ title: "Test", priority: "critical" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid requestType value not in the enum", () => {
    const result = intakeFormSchema.safeParse({ title: "Test", requestType: "enhancement" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed submitterEmail", () => {
    const result = intakeFormSchema.safeParse({ title: "Test", submitterEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("intakeSubmitResponseContract — response envelope", () => {
  it("accepts a success response carrying a message string", () => {
    const result = intakeSubmitResponseContract.safeParse({ message: "Submission received" });
    expect(result.success).toBe(true);
  });

  it("rejects a response with no message field", () => {
    const result = intakeSubmitResponseContract.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("NestJS error envelope — machine-readable message", () => {
  it("accepts a standard NestJS 400 error shape with a string message", () => {
    const result = nestErrorEnvelopeSchema.safeParse({
      message: "Title is required",
      code: "VALIDATION_ERROR",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a NestJS validation error with an array of messages", () => {
    const result = nestErrorEnvelopeSchema.safeParse({
      message: ["title must not be empty", "priority must be a valid enum value"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(Array.isArray(result.data.message)).toBe(true);
    }
  });

  it("rejects a response that has no message field", () => {
    const result = nestErrorEnvelopeSchema.safeParse({ error: "Bad Request" });
    expect(result.success).toBe(false);
  });
});

describe("schema field alignment — frontend vs backend contract", () => {
  it("all backend-required fields are present in the schema output type", () => {
    const parsed = intakeFormSchema.safeParse({ title: "Alignment check" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(typeof parsed.data.title).toBe("string");
      expect(parsed.data.description).toBeUndefined();
      expect(parsed.data.submitterName).toBeUndefined();
      expect(parsed.data.submitterEmail).toBeUndefined();
      expect(parsed.data.priority).toBeUndefined();
      expect(parsed.data.requestType).toBeUndefined();
    }
  });

  it("priority enum values match the backend enumeration exactly", () => {
    const validPriorities = ["low", "medium", "high", "urgent"] as const;
    for (const priority of validPriorities) {
      const result = intakeFormSchema.safeParse({ title: "T", priority });
      expect(result.success).toBe(true);
    }
  });

  it("requestType enum values match the backend enumeration exactly", () => {
    const validTypes = ["bug", "feature", "task", "question", "other"] as const;
    for (const requestType of validTypes) {
      const result = intakeFormSchema.safeParse({ title: "T", requestType });
      expect(result.success).toBe(true);
    }
  });
});
