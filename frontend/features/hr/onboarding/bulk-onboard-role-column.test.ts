import { BULK_ONBOARD_COLUMNS, validateAndMap, type ParsedRow } from "./bulk-onboard-template";

const DEPARTMENTS = new Set(["engineering"]);

function rowWithRole(role: string): ParsedRow {
  return {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    designation: "Software Engineer",
    department: "Engineering",
    role,
  };
}

describe("the bulk onboarding role column only carries roles the endpoint accepts", () => {
  it("rejects a module role slug before the upload reaches the API", () => {
    const result = validateAndMap(rowWithRole("HR_MODULE_ADMIN"), DEPARTMENTS);

    expect(result.payload).toBeNull();
    expect(result.errors).toContain("role must be MEMBER or ORG_ADMIN");
  });

  it("rejects the department slug the template used to sample", () => {
    const result = validateAndMap(rowWithRole("ENGINEERING"), DEPARTMENTS);

    expect(result.payload).toBeNull();
    expect(result.errors).toContain("role must be MEMBER or ORG_ADMIN");
  });

  it("accepts a lower-case role and uploads it in the casing the API expects", () => {
    const result = validateAndMap(rowWithRole("org_admin"), DEPARTMENTS);

    expect(result.errors).toEqual([]);
    expect(result.payload?.role).toBe("ORG_ADMIN");
  });

  it("leaves the role out when the column is blank, so the API applies MEMBER", () => {
    const result = validateAndMap(rowWithRole(""), DEPARTMENTS);

    expect(result.errors).toEqual([]);
    expect(result.payload).not.toBeNull();
    expect(result.payload && "role" in result.payload).toBe(false);
  });

  it("samples a role the API accepts, so a template filled as shown imports", () => {
    const roleColumn = BULK_ONBOARD_COLUMNS.find((column) => column.key === "role");

    expect(roleColumn).toBeDefined();
    expect(validateAndMap(rowWithRole(roleColumn?.sample ?? ""), DEPARTMENTS).errors).toEqual([]);
  });
});
