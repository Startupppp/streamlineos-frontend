import type { CustomFieldDefinition } from "@/hooks/api/crm/custom-fields";
import { customFieldsLayout, mergeCustomData } from "./custom-fields-form";

function field(name: string, fieldType: CustomFieldDefinition["fieldType"]): CustomFieldDefinition {
  return {
    id: 1, orgId: "o", entityType: "lead", name, label: name, fieldType,
    options: null, isRequired: false, isActive: true, sortOrder: 0, createdAt: null, updatedAt: null,
  };
}

describe("mergeCustomData", () => {
  const fields = [field("size", "number"), field("vip", "boolean"), field("region", "text")];

  it("keeps keys the form does not own and types the form's strings back", () => {
    const next = mergeCustomData(fields, { bant: { budget: true }, size: 3 }, { size: "12", vip: "true", region: " EU " });
    expect(next).toEqual({ bant: { budget: true }, size: 12, vip: true, region: "EU" });
  });

  it("clears an emptied field to null and refuses a non-number", () => {
    expect(mergeCustomData(fields, {}, { size: "abc", vip: "false", region: "" })).toEqual({
      size: null, vip: false, region: null,
    });
  });
});

describe("customFieldsLayout", () => {
  it("puts every field in the form section", () => {
    expect(customFieldsLayout("deal", [field("a", "text"), field("b", "date")]).form.sections[0]?.fields).toEqual(["a", "b"]);
  });
});
