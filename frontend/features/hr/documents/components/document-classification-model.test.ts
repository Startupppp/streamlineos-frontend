import {
  audiencesFromForm,
  classificationFormSchema,
  formValuesFromView,
  sameAudiences,
  type ClassificationFormValues,
} from "./document-classification-model";

const base: ClassificationFormValues = {
  classification: "INTERNAL",
  effectiveDate: "",
  audienceMode: "ALL_EMPLOYEES",
  departmentIds: [],
  locationIds: [],
};

describe("document classification model", () => {
  describe("reading a document into the form", () => {
    it("shows a document nobody has given an audience as HR only", () => {
      const values = formValuesFromView({ classification: "PERSONAL", effectiveDate: null, audiences: [] });

      expect(values).toMatchObject({ classification: "PERSONAL", audienceMode: "HR_ONLY", effectiveDate: "" });
    });

    it("reads all-employees as its own mode, even alongside other rows", () => {
      const values = formValuesFromView({
        classification: "INTERNAL",
        effectiveDate: "2026-01-15",
        audiences: [
          { id: 1, kind: "DEPARTMENT", refId: "d1", label: "Finance" },
          { id: 2, kind: "ALL_EMPLOYEES", refId: null, label: null },
        ],
      });

      expect(values).toMatchObject({ audienceMode: "ALL_EMPLOYEES", effectiveDate: "2026-01-15" });
    });

    it("splits selected departments and locations", () => {
      const values = formValuesFromView({
        classification: "RESTRICTED",
        effectiveDate: null,
        audiences: [
          { id: 1, kind: "DEPARTMENT", refId: "d1", label: "Finance" },
          { id: 2, kind: "LOCATION", refId: "l1", label: "Pune" },
        ],
      });

      expect(values).toMatchObject({ audienceMode: "SELECTED", departmentIds: ["d1"], locationIds: ["l1"] });
    });
  });

  describe("choosing what to send", () => {
    it("sends no audience for a class that can never be shared, whatever the form still holds", () => {
      for (const classification of ["PERSONAL", "CONFIDENTIAL"] as const) {
        expect(audiencesFromForm({ ...base, classification, audienceMode: "ALL_EMPLOYEES" })).toEqual([]);
      }
    });

    it("sends all employees, or nothing for HR only, or exactly the ticked units", () => {
      expect(audiencesFromForm({ ...base, audienceMode: "ALL_EMPLOYEES" })).toEqual([{ kind: "ALL_EMPLOYEES", refId: null }]);
      expect(audiencesFromForm({ ...base, audienceMode: "HR_ONLY" })).toEqual([]);
      expect(audiencesFromForm({ ...base, audienceMode: "SELECTED", departmentIds: ["d1"], locationIds: ["l1", "l2"] })).toEqual([
        { kind: "DEPARTMENT", refId: "d1" },
        { kind: "LOCATION", refId: "l1" },
        { kind: "LOCATION", refId: "l2" },
      ]);
    });
  });

  describe("the form", () => {
    it("asks for at least one unit when a shareable document is limited to selected ones", () => {
      const result = classificationFormSchema.safeParse({ ...base, audienceMode: "SELECTED" });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["audienceMode"]);
    });

    it("does not ask for units on a class that is not shared, and accepts a picked one", () => {
      expect(classificationFormSchema.safeParse({ ...base, classification: "CONFIDENTIAL", audienceMode: "SELECTED" }).success).toBe(true);
      expect(classificationFormSchema.safeParse({ ...base, audienceMode: "SELECTED", locationIds: ["l1"] }).success).toBe(true);
    });
  });

  describe("comparing audiences", () => {
    it("ignores order and duplicates", () => {
      expect(
        sameAudiences(
          [{ kind: "DEPARTMENT", refId: "d1" }, { kind: "LOCATION", refId: "l1" }],
          [{ kind: "LOCATION", refId: "l1" }, { kind: "DEPARTMENT", refId: "d1" }, { kind: "DEPARTMENT", refId: "d1" }],
        ),
      ).toBe(true);
    });

    it("tells apart a different unit of the same kind", () => {
      expect(sameAudiences([{ kind: "DEPARTMENT", refId: "d1" }], [{ kind: "DEPARTMENT", refId: "d2" }])).toBe(false);
    });
  });
});
