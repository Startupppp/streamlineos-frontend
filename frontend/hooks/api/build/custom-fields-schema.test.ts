import { buildCustomFieldContract, buildCustomFieldListContract } from "./build-project-schema";

const validField = {
  id: 1,
  orgId: "org-abc",
  projectId: 10,
  name: "Story Points",
  type: "number" as const,
  options: null,
  required: false,
  position: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("buildCustomFieldContract (BLD-X-BE-SETTINGS-CF-001)", () => {
  it("accepts a valid custom field row", () => {
    expect(buildCustomFieldContract.safeParse(validField).success).toBe(true);
  });

  it("rejects unknown field type — z.string() over an enum would silently accept this", () => {
    expect(
      buildCustomFieldContract.safeParse({ ...validField, type: "rating" }).success
    ).toBe(false);
  });

  it("accepts every valid field type value", () => {
    for (const type of ["text", "number", "date", "user", "select", "multi_select", "checkbox", "url", "currency"] as const) {
      expect(buildCustomFieldContract.safeParse({ ...validField, type }).success).toBe(true);
    }
  });

  it("accepts null options for non-select types", () => {
    expect(
      buildCustomFieldContract.safeParse({ ...validField, type: "text", options: null }).success
    ).toBe(true);
  });

  it("accepts an array of strings for options on select type", () => {
    expect(
      buildCustomFieldContract.safeParse({ ...validField, type: "select", options: ["Open", "Closed"] }).success
    ).toBe(true);
  });

  it("rejects required as a string instead of boolean", () => {
    expect(
      buildCustomFieldContract.safeParse({ ...validField, required: "true" }).success
    ).toBe(false);
  });

  it("accepts required as true", () => {
    expect(
      buildCustomFieldContract.safeParse({ ...validField, required: true }).success
    ).toBe(true);
  });

  it("accepts required as false", () => {
    expect(
      buildCustomFieldContract.safeParse({ ...validField, required: false }).success
    ).toBe(true);
  });

  it("rejects a field missing name", () => {
    const { name: _name, ...withoutName } = validField;
    expect(buildCustomFieldContract.safeParse(withoutName).success).toBe(false);
  });

  it("rejects a field missing type", () => {
    const { type: _type, ...withoutType } = validField;
    expect(buildCustomFieldContract.safeParse(withoutType).success).toBe(false);
  });

  it("rejects a field missing createdAt", () => {
    const { createdAt: _createdAt, ...withoutCreatedAt } = validField;
    expect(buildCustomFieldContract.safeParse(withoutCreatedAt).success).toBe(false);
  });

  it("rejects a field missing projectId", () => {
    const { projectId: _projectId, ...withoutProjectId } = validField;
    expect(buildCustomFieldContract.safeParse(withoutProjectId).success).toBe(false);
  });
});

describe("buildCustomFieldListContract (BLD-X-BE-SETTINGS-CF-002)", () => {
  it("accepts an empty array", () => {
    expect(buildCustomFieldListContract.safeParse([]).success).toBe(true);
  });

  it("accepts an array with a valid field row", () => {
    expect(buildCustomFieldListContract.safeParse([validField]).success).toBe(true);
  });

  it("accepts an array with multiple different field types", () => {
    const textField = { ...validField, id: 2, type: "text" as const, name: "Notes" };
    const dateField = { ...validField, id: 3, type: "date" as const, name: "Due Date" };
    expect(buildCustomFieldListContract.safeParse([validField, textField, dateField]).success).toBe(true);
  });

  it("rejects a non-array", () => {
    expect(buildCustomFieldListContract.safeParse(validField).success).toBe(false);
  });

  it("rejects an array containing a field with an unknown type", () => {
    expect(
      buildCustomFieldListContract.safeParse([{ ...validField, type: "file" }]).success
    ).toBe(false);
  });

  it("rejects an array containing a field missing required fields", () => {
    const { name: _name, ...withoutName } = validField;
    expect(buildCustomFieldListContract.safeParse([withoutName]).success).toBe(false);
  });
});

describe("custom-fields cache key contract (BLD-X-BE-SETTINGS-CF-003)", () => {
  it("includes projectId in the key — correct scope prevents cross-project data leaks", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key = buildWorkQueryKeys.projects.customFields(10);
    expect(key).toContain(10);
  });

  it("two different projectIds produce different cache keys", () => {
    const { buildWorkQueryKeys } = require("@/lib/query-keys/build-work");
    const key1 = buildWorkQueryKeys.projects.customFields(1);
    const key2 = buildWorkQueryKeys.projects.customFields(2);
    expect(JSON.stringify(key1)).not.toBe(JSON.stringify(key2));
  });
});
