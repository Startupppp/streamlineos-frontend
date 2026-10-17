import { updateModuleSchema } from "./update-module-schema";

it("rejects a payload missing version so a stale-token omission cannot come back silently", () => {
  const result = updateModuleSchema.safeParse({ name: "Auth Module", status: "in-progress" });
  expect(result.success).toBe(false);
});

it("accepts a valid payload that includes version", () => {
  const result = updateModuleSchema.safeParse({ version: 1, name: "Auth Module", status: "in-progress" });
  expect(result.success).toBe(true);
});

it("rejects version of zero since optimistic concurrency tokens are positive", () => {
  const result = updateModuleSchema.safeParse({ version: 0, name: "Auth Module" });
  expect(result.success).toBe(false);
});

it("rejects a non-integer version so a floating-point token cannot pass", () => {
  const result = updateModuleSchema.safeParse({ version: 1.5, status: "backlog" });
  expect(result.success).toBe(false);
});

it("accepts a payload with only version so a no-op update is valid", () => {
  const result = updateModuleSchema.safeParse({ version: 2 });
  expect(result.success).toBe(true);
});

it("rejects end date before start date to mirror backend superRefine", () => {
  const result = updateModuleSchema.safeParse({
    version: 1,
    startDate: "2026-10-10",
    endDate: "2026-10-05",
  });
  expect(result.success).toBe(false);
});
