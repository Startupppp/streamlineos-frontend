import { branchFormSchema, EMPTY_BRANCH_FORM_VALUES, type BranchFormValues } from "./branch-form-schema";

const VALID: BranchFormValues = {
  name: "Mumbai Branch",
  code: "MUM",
  businessUnitId: "",
  managerUserId: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  address: "",
  phone: "",
  email: "",
};

describe("branchFormSchema — phone", () => {
  it("accepts an empty string for optional phone", () => {
    expect(branchFormSchema.safeParse(VALID).success).toBe(true);
  });

  it("accepts a valid E.164 phone number", () => {
    expect(branchFormSchema.safeParse({ ...VALID, phone: "+919876543210" }).success).toBe(true);
  });

  it("rejects a too-short phone number", () => {
    expect(branchFormSchema.safeParse({ ...VALID, phone: "+91 12" }).success).toBe(false);
  });

  it("rejects a phone number without a country code", () => {
    expect(branchFormSchema.safeParse({ ...VALID, phone: "9876543210" }).success).toBe(false);
  });
});

describe("EMPTY_BRANCH_FORM_VALUES", () => {
  it("satisfies the BranchFormValues type at compile time", () => {
    const typed: BranchFormValues = EMPTY_BRANCH_FORM_VALUES;
    expect(typed).toBeDefined();
  });
});
