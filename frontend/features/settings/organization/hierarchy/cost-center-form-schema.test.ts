import {
  costCenterFormSchema,
  type CostCenterFormValues,
  EMPTY_COST_CENTER_FORM_VALUES,
} from "./cost-center-form-schema";

const VALID: CostCenterFormValues = {
  code: "CC001",
  name: "Engineering",
  description: "Core engineering cost center",
};

describe("costCenterFormSchema", () => {
  describe("valid payload", () => {
    it("accepts a fully populated valid payload", () => {
      expect(costCenterFormSchema.safeParse(VALID).success).toBe(true);
    });
  });

  describe("code — boundary and alphanumeric", () => {
    it("rejects an empty code", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, code: "" }).success).toBe(false);
    });

    it("rejects code at exactly 1 character", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, code: "A" }).success).toBe(false);
    });

    it("accepts code at exactly 2 characters", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, code: "AB" }).success).toBe(true);
    });

    it("accepts code at exactly 20 characters", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, code: "A".repeat(20) }).success).toBe(true);
    });

    it("rejects code at 21 characters", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, code: "A".repeat(21) }).success).toBe(false);
    });

    it("rejects a code containing a hyphen with 'Only alphanumeric characters'", () => {
      const result = costCenterFormSchema.safeParse({ ...VALID, code: "AB-CD" });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.map((e) => e.message)).toContain("Only alphanumeric characters");
    });

    it("rejects a code with an internal space with 'Only alphanumeric characters'", () => {
      const result = costCenterFormSchema.safeParse({ ...VALID, code: "AB CD" });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.map((e) => e.message)).toContain("Only alphanumeric characters");
    });

    it("rejects a code containing an underscore with 'Only alphanumeric characters'", () => {
      const result = costCenterFormSchema.safeParse({ ...VALID, code: "AB_CD" });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.map((e) => e.message)).toContain("Only alphanumeric characters");
    });
  });

  describe("name — required and refine", () => {
    it("rejects an empty name and reports 'Name is required'", () => {
      const result = costCenterFormSchema.safeParse({ ...VALID, name: "" });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.map((e) => e.message)).toContain("Name is required");
    });

    it("accepts name at exactly 1 character containing a letter", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, name: "A" }).success).toBe(true);
    });

    it("accepts name at exactly 100 characters", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, name: "A".repeat(100) }).success).toBe(true);
    });

    it("rejects name at 101 characters", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, name: "A".repeat(101) }).success).toBe(false);
    });

    it("rejects a name of only hyphens with the refine message", () => {
      const result = costCenterFormSchema.safeParse({ ...VALID, name: "---" });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.map((e) => e.message)).toContain(
          "Name must contain at least one letter or number",
        );
    });

    it("rejects a name of only hash symbols with the refine message", () => {
      const result = costCenterFormSchema.safeParse({ ...VALID, name: "###" });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.map((e) => e.message)).toContain(
          "Name must contain at least one letter or number",
        );
    });

    it("accepts a Devanagari name — refine uses Unicode property escapes", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, name: "अभियांत्रिकी" }).success).toBe(true);
    });

    it("accepts a CJK name — refine uses Unicode property escapes", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, name: "工程部" }).success).toBe(true);
    });
  });

  describe("description — optional, max 500", () => {
    it("parses when description is omitted", () => {
      expect(
        costCenterFormSchema.safeParse({ code: VALID.code, name: VALID.name }).success,
      ).toBe(true);
    });

    it("accepts description at exactly 500 characters", () => {
      expect(
        costCenterFormSchema.safeParse({ ...VALID, description: "a".repeat(500) }).success,
      ).toBe(true);
    });

    it("rejects description at 501 characters", () => {
      expect(
        costCenterFormSchema.safeParse({ ...VALID, description: "a".repeat(501) }).success,
      ).toBe(false);
    });
  });

  describe("trim transformations", () => {
    it("trims code before length and regex checks, emitting the cleaned value", () => {
      const result = costCenterFormSchema.safeParse({ ...VALID, code: "  ABC  " });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.code).toBe("ABC");
    });

    it("rejects code that trims to fewer than 2 characters", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, code: "  A  " }).success).toBe(false);
    });

    it("trims name before validation, emitting the cleaned value", () => {
      const result = costCenterFormSchema.safeParse({ ...VALID, name: "  Engineering  " });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.name).toBe("Engineering");
    });

    it("rejects a whitespace-only name after trimming", () => {
      expect(costCenterFormSchema.safeParse({ ...VALID, name: "   " }).success).toBe(false);
    });

    it("trims description before validation, emitting the cleaned value", () => {
      const result = costCenterFormSchema.safeParse({ ...VALID, description: "  desc  " });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.description).toBe("desc");
    });
  });

  describe("EMPTY_COST_CENTER_FORM_VALUES", () => {
    it("satisfies the CostCenterFormValues type at compile time", () => {
      const typed: CostCenterFormValues = EMPTY_COST_CENTER_FORM_VALUES;
      expect(typed).toBeDefined();
    });

    it("does not pass safeParse — it is an empty draft, not a valid payload", () => {
      expect(costCenterFormSchema.safeParse(EMPTY_COST_CENTER_FORM_VALUES).success).toBe(false);
    });
  });
});
