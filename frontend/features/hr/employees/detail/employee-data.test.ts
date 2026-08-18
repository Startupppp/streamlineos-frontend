import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { employeeDataSchema } from "./employee-data";

const SAFE_EMPLOYEE = {
  id: "employee-user-1",
  name: "Ada Lovelace",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.test",
  role: "MEMBER",
  designation: "Engineer",
  employeeId: "EMP-1",
  orgDepartmentId: "department-1",
  image: null,
  isActive: true,
  joiningDate: "2026-08-01",
  reportingTo: null,
  bio: null,
  linkedinUrl: null,
  twitterUrl: null,
  githubUrl: null,
  websiteUrl: null,
  skills: [],
  phone: null,
  employmentStatus: "ACTIVE",
  employment: null,
};

describe("employee base response contract", () => {
  it("accepts only the explicitly modelled ordinary profile response", () => {
    expect(employeeDataSchema.parse(SAFE_EMPLOYEE)).toEqual(SAFE_EMPLOYEE);
  });

  it.each([
    "salaryAmountCents",
    "monthlySalary",
    "bankDetails",
    "taxId",
    "dateOfBirth",
    "personalEmail",
    "address",
    "emergencyContact",
  ])("rejects the sensitive response field %s", (sensitiveField) => {
    expect(
      employeeDataSchema.safeParse({
        ...SAFE_EMPLOYEE,
        [sensitiveField]: "must-not-cross-the-base-boundary",
      }).success,
    ).toBe(false);
  });

  it("requires the SSR route to parse the payload before rendering", () => {
    const routeSource = readFileSync(
      resolve(
        process.cwd(),
        "app",
        "(authenticated)",
        "hr",
        "employees",
        "[employeeId]",
        "page.tsx",
      ),
      "utf8",
    );

    expect(routeSource).toContain("employeeDataSchema.parse(response)");
  });
});
