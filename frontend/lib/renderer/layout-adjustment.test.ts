import { type RecordLayout } from "./layout";
import { validateLayout } from "./layout-validation";
import {
  applyAdjustment,
  hidableFields,
  UNGROUPED_SECTION_TITLE,
  validateAdjustment,
  withColumns,
  withFormFields,
  type LayoutAdjustment,
} from "./layout-adjustment";
import { proposeFromFill, MIN_SAMPLE } from "./layout-proposal";
import { formFields, patchForUpdate, payloadForCreate, schemaForLayout } from "./layout-schema";

const LAYOUT: RecordLayout = {
  key: "specimen",
  singular: "Specimen",
  plural: "Specimens",
  titleField: "label",
  fields: [
    { name: "label", label: "Label", kind: "text", required: true },
    { name: "owner", label: "Owner", kind: "text" },
    { name: "site", label: "Site", kind: "text" },
    { name: "collectedAt", label: "Collected", kind: "date" },
    { name: "mass", label: "Mass", kind: "number" },
    { name: "notes", label: "Notes", kind: "longText" },
  ],
  list: {
    searchPlaceholder: "Search specimens…",
    columns: [
      { field: "label", primary: true, subtitle: "site" },
      { field: "owner" },
      { field: "collectedAt" },
      { field: "mass" },
    ],
  },
  detail: {
    sections: [
      { title: "Identity", fields: ["label", "owner", "site"] },
      { title: "Record", fields: ["collectedAt", "mass", "notes"] },
    ],
  },
  form: {
    sections: [
      { title: "Identity", fields: ["label", "owner", "site"] },
      { title: "Record", fields: ["collectedAt", "mass", "notes"] },
    ],
  },
};

const names = (layout: RecordLayout) => layout.list.columns.map((column) => column.field);

describe("an arrangement applied to a description", () => {
  it("produces a layout the engine still considers valid", () => {
    const adjusted = applyAdjustment(LAYOUT, {
      layoutKey: "specimen",
      hidden: ["owner"],
      order: ["mass", "label"],
    });
    expect(validateLayout(adjusted)).toEqual([]);
  });

  it("reorders the columns a tenant named and leaves the rest where they were", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", order: ["mass", "owner"] });
    expect(names(adjusted)).toEqual(["mass", "owner", "label", "collectedAt"]);
  });

  it("hides a column from the list without touching the record's fields", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", hidden: ["owner"] });
    expect(names(adjusted)).not.toContain("owner");
    expect(adjusted.fields.map((field) => field.name)).toContain("owner");
  });

  it("hides a field from the detail view without removing it from the description", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", hidden: ["notes"] });
    const shown = adjusted.detail.sections.flatMap((section) => section.fields);
    expect(shown).not.toContain("notes");
    expect(adjusted.fields.some((field) => field.name === "notes")).toBe(true);
  });

  it("refuses to hide the field that titles the record", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", hidden: ["label"] });
    expect(names(adjusted)).toContain("label");
    expect(validateAdjustment(LAYOUT, { layoutKey: "specimen", hidden: ["label"] })).toContainEqual(
      expect.objectContaining({ where: "hidden[0]" }),
    );
  });

  it("refuses to hide a required field, which would leave the form unsubmittable", () => {
    const withRequired: RecordLayout = {
      ...LAYOUT,
      fields: LAYOUT.fields.map((field) =>
        field.name === "owner" ? { ...field, required: true } : field,
      ),
    };
    expect(hidableFields(withRequired)).not.toContain("owner");

    const adjusted = applyAdjustment(withRequired, {
      layoutKey: "specimen",
      hidden: ["owner"],
    });
    expect(formFields(adjusted, "create").map((field) => field.name)).toContain("owner");
  });

  it("keeps a hidden optional field out of the form without dropping it from the schema source", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", hidden: ["notes"] });
    expect(formFields(adjusted, "edit").map((field) => field.name)).not.toContain("notes");
    expect(adjusted.fields.some((field) => field.name === "notes")).toBe(true);
  });

  it("moves the mobile card's title to whatever column now comes first", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", order: ["mass"] });
    expect(adjusted.list.columns[0]).toEqual(expect.objectContaining({ field: "mass", primary: true }));
    expect(adjusted.list.columns.filter((column) => column.primary)).toHaveLength(1);
  });

  it("drops a subtitle whose field the tenant hid, rather than rendering a blank line", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", hidden: ["site"] });
    expect(adjusted.list.columns[0]?.subtitle).toBeUndefined();
  });

  it("groups the detail view into the tenant's own sections", () => {
    const adjusted = applyAdjustment(LAYOUT, {
      layoutKey: "specimen",
      groups: [{ title: "Who and where", fields: ["label", "owner", "site"] }],
    });
    expect(adjusted.detail.sections[0]?.title).toBe("Who and where");
  });

  it("keeps a field the tenant forgot to place, rather than losing it to a grouping", () => {
    const adjusted = applyAdjustment(LAYOUT, {
      layoutKey: "specimen",
      groups: [{ title: "Who and where", fields: ["label", "owner"] }],
    });
    const trailing = adjusted.detail.sections.find(
      (section) => section.title === UNGROUPED_SECTION_TITLE,
    );
    expect(trailing?.fields).toEqual(expect.arrayContaining(["site", "collectedAt", "mass", "notes"]));
  });

  it("ignores a field the description no longer declares", () => {
    const adjustment: LayoutAdjustment = {
      layoutKey: "specimen",
      order: ["removedLastYear"],
      hidden: ["alsoGone"],
    };
    expect(() => applyAdjustment(LAYOUT, adjustment)).not.toThrow();
    expect(validateLayout(applyAdjustment(LAYOUT, adjustment))).toEqual([]);
    expect(validateAdjustment(LAYOUT, adjustment)).toEqual([
      expect.objectContaining({ where: "order[0]" }),
      expect.objectContaining({ where: "hidden[0]" }),
    ]);
  });

  it("renders the description untouched when a tenant has arranged nothing", () => {
    expect(applyAdjustment(LAYOUT, null)).toBe(LAYOUT);
  });
});

describe("hiding a field is display and nothing else", () => {
  it("cannot reveal a field the description never published", () => {
    const adjusted = applyAdjustment(LAYOUT, {
      layoutKey: "specimen",
      order: ["salary", "label"],
      groups: [{ title: "Everything", fields: ["salary", "label", "owner"] }],
    });

    const rendered = new Set([
      ...adjusted.list.columns.map((column) => column.field),
      ...adjusted.detail.sections.flatMap((section) => section.fields),
      ...adjusted.form.sections.flatMap((section) => section.fields),
    ]);
    expect(rendered.has("salary")).toBe(false);
    expect(adjusted.fields.map((field) => field.name)).toEqual(
      LAYOUT.fields.map((field) => field.name),
    );
  });

  it("unhiding a field cannot make a denied read succeed, because it changes no request", () => {
    const hiddenEverything = applyAdjustment(LAYOUT, {
      layoutKey: "specimen",
      hidden: hidableFields(LAYOUT),
    });
    const shownEverything = applyAdjustment(LAYOUT, { layoutKey: "specimen", hidden: [] });

    expect(hiddenEverything.fields).toEqual(shownEverything.fields);
    expect(hiddenEverything.fields).toEqual(LAYOUT.fields);
  });

  it("leaves a hidden field out of an update entirely, rather than sending it as null", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", hidden: ["notes"] });
    const patch = patchForUpdate(adjusted, { label: "S-1", owner: "Priya", site: "", collectedAt: "", mass: "" });

    expect("notes" in patch).toBe(false);
    expect(patch.site).toBeNull();
  });

  it("omits an empty field on create rather than sending null for it", () => {
    const payload = payloadForCreate(LAYOUT, {
      label: "S-1",
      owner: "",
      site: "Bay 4",
      collectedAt: "",
      mass: "",
      notes: "",
    });
    expect(payload).toEqual({ label: "S-1", site: "Bay 4" });
  });

  it("still submits a required field a tenant tried to hide", () => {
    const withRequired: RecordLayout = {
      ...LAYOUT,
      fields: LAYOUT.fields.map((field) =>
        field.name === "owner" ? { ...field, required: true } : field,
      ),
    };
    const adjusted = applyAdjustment(withRequired, { layoutKey: "specimen", hidden: ["owner"] });
    expect(patchForUpdate(adjusted, { label: "S-1", owner: "Priya" }).owner).toBe("Priya");
  });
});

describe("a layout proposed from what the tenant fills in", () => {
  const ALL = MIN_SAMPLE;
  const counts = (over: Record<string, number> = {}) => ({
    label: ALL,
    owner: 0,
    site: ALL,
    collectedAt: ALL,
    mass: ALL,
    notes: 0,
    ...over,
  });

  it("offers nothing from a sample too small to mean anything", () => {
    expect(proposeFromFill(LAYOUT, MIN_SAMPLE - 1, counts())).toBeNull();
  });

  it("proposes hiding a field no record has ever carried a value for", () => {
    expect(proposeFromFill(LAYOUT, ALL, counts())?.hiding).toEqual(
      expect.arrayContaining(["owner", "notes"]),
    );
  });

  it("leaves a field alone that one record in the sample uses", () => {
    expect(proposeFromFill(LAYOUT, ALL, counts({ owner: 1 }))?.hiding).not.toContain("owner");
  });

  it("never proposes hiding the title field, however empty the sample looks", () => {
    expect(proposeFromFill(LAYOUT, ALL, counts({ label: 0 }))?.hiding).not.toContain("label");
  });

  it("puts the title first and then orders by how often a field is filled", () => {
    const order = proposeFromFill(LAYOUT, ALL, counts({ mass: 5 }))?.adjustment.order ?? [];
    expect(order[0]).toBe("label");
    expect(order.indexOf("site")).toBeLessThan(order.indexOf("mass"));
  });

  it("treats a field the counts do not mention as never filled", () => {
    const proposal = proposeFromFill(LAYOUT, ALL, { label: ALL });
    expect(proposal?.hiding).toEqual(expect.arrayContaining(["owner", "site", "mass", "notes"]));
  });

  it("shows the evidence it argued from rather than only the conclusion", () => {
    const proposal = proposeFromFill(LAYOUT, ALL, counts());
    expect(proposal?.sample).toBe(ALL);
    expect(proposal?.usage.find((entry) => entry.field === "site")?.rate).toBe(1);
    expect(proposal?.usage.find((entry) => entry.field === "owner")?.filled).toBe(0);
  });

  it("proposes an arrangement the engine accepts", () => {
    const proposal = proposeFromFill(LAYOUT, ALL, counts())!;
    expect(validateAdjustment(LAYOUT, proposal.adjustment)).toEqual([]);
    expect(validateLayout(applyAdjustment(LAYOUT, proposal.adjustment))).toEqual([]);
  });
});

describe("a description narrowed for a related-records panel", () => {
  it("keeps only the named columns, in the order the panel asked for", () => {
    const panel = withColumns(LAYOUT, ["mass", "label"]);
    expect(names(panel)).toEqual(["mass", "label"]);
  });

  it("moves the mobile card's title onto the column that now comes first", () => {
    const panel = withColumns(LAYOUT, ["mass", "label"]);
    expect(panel.list.columns[0]).toEqual(expect.objectContaining({ field: "mass", primary: true }));
    expect(validateLayout(panel)).toEqual([]);
  });

  it("cannot bring back a column the tenant hid, because it narrows what it is given", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", hidden: ["owner"] });
    expect(names(withColumns(adjusted, ["owner", "label"]))).toEqual(["label"]);
  });

  it("leaves the description alone rather than producing a list with no columns", () => {
    expect(withColumns(LAYOUT, ["nothingCalledThis"])).toBe(LAYOUT);
  });

  it("does not touch the detail view or the form, which the panel is not rendering", () => {
    const panel = withColumns(LAYOUT, ["mass"]);
    expect(panel.detail).toBe(LAYOUT.detail);
    expect(panel.form).toBe(LAYOUT.form);
  });
});

describe("a description narrowed for one composer", () => {
  it("keeps only the fields the composer asked for", () => {
    const composer = withFormFields(LAYOUT, ["label", "notes"]);
    expect(formFields(composer, "create").map((field) => field.name)).toEqual(["label", "notes"]);
  });

  it("ignores a field the form never offered, rather than smuggling one in", () => {
    const composer = withFormFields(LAYOUT, ["nothingCalledThis", "collectedAt"]);
    expect(formFields(composer, "create").map((field) => field.name)).toEqual(["collectedAt"]);
  });

  it("offers no controls when it can keep nothing, rather than widening to the whole form", () => {
    const composer = withFormFields(LAYOUT, ["nothingCalledThis"]);
    expect(composer.form.sections).toEqual([]);
    expect(formFields(composer, "create")).toEqual([]);
  });

  it("cannot bring back a field the tenant hid, because it narrows what it is given", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", hidden: ["notes"] });
    expect(formFields(withFormFields(adjusted, ["notes", "label"]), "edit").map((f) => f.name)).toEqual([
      "label",
    ]);
  });

  it("does not touch the list or the detail view, which the composer is not rendering", () => {
    const composer = withFormFields(LAYOUT, ["label"]);
    expect(composer.list).toBe(LAYOUT.list);
    expect(composer.detail).toBe(LAYOUT.detail);
  });

  it("still validates against the description rather than a schema written beside it", () => {
    const composer = withFormFields(LAYOUT, ["label", "mass"]);
    const schema = schemaForLayout(composer, "create");
    expect(schema.safeParse({ label: "", mass: "12" }).success).toBe(false);
    expect(schema.safeParse({ label: "S-1", mass: "twelve" }).success).toBe(false);
    expect(schema.safeParse({ label: "S-1", mass: "12" }).success).toBe(true);
  });
});

describe("a composer whose fields the tenant has all hidden", () => {
  it("offers no controls rather than quietly widening to the whole form", () => {
    const adjusted = applyAdjustment(LAYOUT, { layoutKey: "specimen", hidden: ["notes"] });
    const composer = withFormFields(adjusted, ["notes"]);
    expect(formFields(composer, "edit")).toEqual([]);
    expect(composer.form.sections).toEqual([]);
  });
});

describe("a composer that insists on more than the record type does", () => {
  it("marks a field required for this framing only", () => {
    const composer = withFormFields(LAYOUT, ["notes"], { required: ["notes"] });
    expect(formFields(composer, "create")[0]?.required).toBe(true);
    expect(LAYOUT.fields.find((field) => field.name === "notes")?.required).toBeUndefined();
  });

  it("enforces the tightened field through the generated schema", () => {
    const composer = withFormFields(LAYOUT, ["notes"], { required: ["notes"] });
    const schema = schemaForLayout(composer, "create");
    expect(schema.safeParse({ notes: "" }).success).toBe(false);
    expect(schema.safeParse({ notes: "Spoke to Priya" }).success).toBe(true);
  });

  it("ignores a tightening of a field the composer does not render", () => {
    const composer = withFormFields(LAYOUT, ["notes"], { required: ["site"] });
    expect(composer.fields.find((field) => field.name === "site")?.required).toBeUndefined();
  });

  it("still accepts a plain title as the third argument", () => {
    expect(withFormFields(LAYOUT, ["notes"], "Log a note").form.sections[0]?.title).toBe(
      "Log a note",
    );
  });
});
