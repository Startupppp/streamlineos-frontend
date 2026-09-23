import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { backendPath } from "@/lib/test-support/backend-path";
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

    expect(routeSource).toMatch(
      /serverGet<EmployeeData>\(\s*`\/hr\/employees\/\$\{employeeId\}`,\s*employeeDataSchema,\s*\)/,
    );
  });
});

describe("employee detail opens for every shape the API returns, because a strict parse of one it does not model renders the route's error page", () => {
  const LEGACY_EMPLOYEE = {
    ...SAFE_EMPLOYEE,
    id: "5780c93a-74da-4cf9-82dd-31ec97ade8aa",
    designation: null,
    employeeId: null,
    orgDepartmentId: null,
    joiningDate: null,
    employmentStatus: null,
    employment: null,
  };

  const ONBOARDED_EMPLOYEE = {
    ...SAFE_EMPLOYEE,
    designation: "QA Audit Tester",
    employeeId: "EMP-EKWK62",
    employmentStatus: "ACTIVE",
    employment: {
      id: 12,
      personId: 34,
      employeeNumber: "EMP-EKWK62",
      lifecycleStatus: "ACTIVE",
      workerType: "FULL_TIME",
      departmentId: "department-1",
      designation: "QA Audit Tester",
      joiningDate: "2026-09-23",
      probationEndDate: null,
      confirmationDate: null,
    },
  };

  it("opens a legacy person who predates hr_employments, whose employment-derived fields are all null", () => {
    const parsed = employeeDataSchema.safeParse(LEGACY_EMPLOYEE);
    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(parsed.success).toBe(true);
  });

  it("opens a newly onboarded employee carrying a full employment record", () => {
    const parsed = employeeDataSchema.safeParse(ONBOARDED_EMPLOYEE);
    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(parsed.success).toBe(true);
  });

  it("accepts a profile with no skills and one with graded skills", () => {
    for (const skills of [[], [{ name: "Testing", level: 3 }]]) {
      expect(
        employeeDataSchema.safeParse({ ...ONBOARDED_EMPLOYEE, skills }).success,
      ).toBe(true);
    }
  });

  it("models exactly the employment keys the backend declares, because production logs a contract violation and returns the row anyway, so the mismatch lands on this screen", () => {
    const source = readFileSync(
      backendPath("src/modules/hr/directory/dto/directory-response.schemas.ts"),
      "utf8",
    );

    const block = /const employmentDetailSchema = z\.object\(\{([\s\S]*?)\}\)/.exec(
      source,
    );
    expect(block).not.toBeNull();

    const backendKeys = [
      ...(block?.[1] ?? "").matchAll(/^\s{2}([A-Za-z0-9_]+):/gm),
    ].map((m) => m[1]);
    expect(backendKeys.length).toBeGreaterThan(0);

    const frontendKeys = Object.keys(
      (ONBOARDED_EMPLOYEE.employment ?? {}) as Record<string, unknown>,
    );
    expect([...backendKeys].sort()).toEqual([...frontendKeys].sort());
    expect(employeeDataSchema.safeParse(ONBOARDED_EMPLOYEE).success).toBe(true);
  });
});
