import { subjectLayout, subjectRecord } from "./subject-layout";
import { validateLayout } from "./layout-validation";
import type { SubjectType } from "@/types/party/subjects";

/**
 * The validation exercise ticket 07 asks for.
 *
 * Two industries that model their work in genuinely different ways, both driven
 * end to end through the same engine. The point is not that these two
 * declarations happen to work — it is to find where one fixed schema strains
 * before fifty surfaces are built on the assumption that it does not.
 */

function subjectType(overrides: Partial<SubjectType> & Pick<SubjectType, "key" | "singular" | "plural" | "titleField" | "fields">): SubjectType {
  return {
    subjectTypeId: `type-${overrides.key}`,
    organizationId: "org-1",
    deletedAt: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

/** Estate agency: the subject is an asset, and parties hold sides of a trade. */
const PROPERTY = subjectType({
  key: "property",
  singular: "Property",
  plural: "Properties",
  titleField: "address",
  fields: [
    { name: "address", label: "Address", kind: "text", required: true },
    { name: "postcode", label: "Postcode", kind: "text", required: true },
    { name: "tenure", label: "Tenure", kind: "select", options: [
      { value: "FREEHOLD", label: "Freehold", tone: "success" },
      { value: "LEASEHOLD", label: "Leasehold", tone: "info" },
    ] },
    { name: "bedrooms", label: "Bedrooms", kind: "number" },
    { name: "askingPrice", label: "Asking price", kind: "money" },
    { name: "listedOn", label: "Listed on", kind: "date" },
    { name: "notes", label: "Notes", kind: "longText" },
  ],
});

/** Recruitment: the subject is a person, and parties are the employers around them. */
const CANDIDATE = subjectType({
  key: "candidate",
  singular: "Candidate",
  plural: "Candidates",
  titleField: "fullName",
  fields: [
    { name: "fullName", label: "Full name", kind: "text", required: true },
    { name: "email", label: "Email", kind: "email", required: true },
    { name: "phone", label: "Phone", kind: "phone" },
    { name: "discipline", label: "Discipline", kind: "select", options: [
      { value: "ENGINEERING", label: "Engineering" },
      { value: "DESIGN", label: "Design" },
    ] },
    { name: "yearsExperience", label: "Years of experience", kind: "number" },
    { name: "desiredSalary", label: "Desired salary", kind: "money" },
    { name: "availableFrom", label: "Available from", kind: "date" },
    { name: "portfolio", label: "Portfolio", kind: "url" },
  ],
});

describe("subjectLayout — two industries through one engine", () => {
  it.each([
    ["property", PROPERTY],
    ["candidate", CANDIDATE],
  ])("produces a layout the engine accepts for a %s", (_name, type) => {
    expect(validateLayout(subjectLayout(type))).toEqual([]);
  });

  it("titles each record by the field its own tenant nominated", () => {
    expect(subjectLayout(PROPERTY).titleField).toBe("address");
    expect(subjectLayout(CANDIDATE).titleField).toBe("fullName");
  });

  it("speaks each tenant's vocabulary rather than a generic one", () => {
    expect(subjectLayout(PROPERTY).list.searchPlaceholder).toBe("Search properties…");
    expect(subjectLayout(CANDIDATE).list.searchPlaceholder).toBe("Search candidates…");
    expect(subjectLayout(CANDIDATE).detail.sections[0]?.title).toBe("Candidate");
  });

  it("leads the list with the title however late the tenant declared it", () => {
    const trailingTitle = subjectType({
      key: "shipment",
      singular: "Shipment",
      plural: "Shipments",
      titleField: "waybill",
      fields: [
        { name: "origin", label: "Origin", kind: "text" },
        { name: "destination", label: "Destination", kind: "text" },
        { name: "waybill", label: "Waybill", kind: "text", required: true },
      ],
    });

    expect(subjectLayout(trailingTitle).list.columns[0]).toMatchObject({
      field: "waybill",
      primary: true,
    });
  });

  it("keeps the list readable when a tenant declares far more fields than fit", () => {
    const wide = subjectType({
      key: "policy",
      singular: "Policy",
      plural: "Policies",
      titleField: "policyNumber",
      fields: Array.from({ length: 30 }, (_, index) => ({
        name: index === 0 ? "policyNumber" : `field${index}`,
        label: index === 0 ? "Policy number" : `Field ${index}`,
        kind: "text" as const,
      })),
    });

    const layout = subjectLayout(wide);
    // Four declared columns plus the two platform ones.
    expect(layout.list.columns).toHaveLength(6);
    // Every declared field still reaches the detail view and the form.
    expect(layout.fields).toHaveLength(33);
    expect(validateLayout(layout)).toEqual([]);
  });

  it("carries every declared field into the detail view, in declaration order", () => {
    const sections = subjectLayout(PROPERTY).detail.sections;
    const detailFields = sections.flatMap((section) => section.fields);
    for (const field of PROPERTY.fields) expect(detailFields).toContain(field.name);
    expect(detailFields.indexOf("address")).toBeLessThan(detailFields.indexOf("postcode"));
  });

  it("excludes the read-only platform field from the form but keeps it on the detail", () => {
    const layout = subjectLayout(CANDIDATE);
    const formFields = layout.form.sections.flatMap((section) => section.fields);
    const detailFields = layout.detail.sections.flatMap((section) => section.fields);

    expect(formFields).not.toContain("createdAt");
    expect(detailFields).toContain("createdAt");
  });
});

describe("subjectRecord", () => {
  it("flattens declared values beside the platform ones the renderer reads", () => {
    const record = subjectRecord({
      subjectId: "s-1",
      reference: "LS-4471",
      status: "UNDER_OFFER",
      createdAt: "2026-08-02T00:00:00.000Z",
      customFields: { address: "14 Bridge Street", bedrooms: 3 },
    });

    expect(record).toMatchObject({
      address: "14 Bridge Street",
      bedrooms: 3,
      reference: "LS-4471",
      status: "UNDER_OFFER",
    });
  });

  it("never lets a declared field shadow the identifier the row is keyed by", () => {
    const record = subjectRecord({
      subjectId: "s-1",
      reference: null,
      status: null,
      createdAt: "2026-08-02T00:00:00.000Z",
      // A tenant may declare a field called subjectId; the real one has to win,
      // or the list keys and opens the wrong row.
      customFields: { subjectId: "not-the-real-one" },
    });

    expect(record.subjectId).toBe("s-1");
  });

  it("handles a record whose type declares nothing it has filled in", () => {
    const record = subjectRecord({
      subjectId: "s-2",
      reference: null,
      status: null,
      createdAt: "2026-08-02T00:00:00.000Z",
      customFields: null,
    });

    expect(record).toEqual({
      subjectId: "s-2",
      reference: null,
      status: null,
      createdAt: "2026-08-02T00:00:00.000Z",
    });
  });
});
