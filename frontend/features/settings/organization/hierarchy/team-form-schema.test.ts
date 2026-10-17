import { teamFormSchema, EMPTY_TEAM_FORM_VALUES, type TeamFormValues } from "./team-form-schema";

const VALID: TeamFormValues = {
  name: "Frontend Team",
  code: "FE",
  departmentId: "dept-1",
  leadUserId: "",
  description: "",
  capacity: "",
};

describe("teamFormSchema — capacity", () => {
  it("accepts an empty string for optional capacity", () => {
    expect(teamFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts undefined capacity", () => {
    const { capacity: _cap, ...rest } = VALID;
    expect(teamFormSchema.safeParse(rest).success).toBe(true);
  });

  it("accepts capacity of 1", () => {
    expect(teamFormSchema.safeParse({ ...VALID, capacity: "1" }).success).toBe(true);
  });

  it("accepts capacity of 9999", () => {
    expect(teamFormSchema.safeParse({ ...VALID, capacity: "9999" }).success).toBe(true);
  });

  it("rejects a negative capacity", () => {
    expect(teamFormSchema.safeParse({ ...VALID, capacity: "-3" }).success).toBe(false);
  });

  it("rejects a decimal capacity", () => {
    expect(teamFormSchema.safeParse({ ...VALID, capacity: "2.5" }).success).toBe(false);
  });

  it("rejects capacity of zero", () => {
    expect(teamFormSchema.safeParse({ ...VALID, capacity: "0" }).success).toBe(false);
  });

  it("rejects capacity above 9999", () => {
    expect(teamFormSchema.safeParse({ ...VALID, capacity: "10000" }).success).toBe(false);
  });

  it("rejects a non-numeric capacity string", () => {
    expect(teamFormSchema.safeParse({ ...VALID, capacity: "abc" }).success).toBe(false);
  });
});

describe("EMPTY_TEAM_FORM_VALUES", () => {
  it("satisfies the TeamFormValues type at compile time", () => {
    const typed: TeamFormValues = EMPTY_TEAM_FORM_VALUES;
    expect(typed).toBeDefined();
  });
});
