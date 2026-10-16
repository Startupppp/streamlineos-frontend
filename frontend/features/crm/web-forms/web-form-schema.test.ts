import { safeRedirect, toLeadSubmission } from "./lead-form-schema";
import { schemaForLayout } from "@/lib/renderer/layout-schema";
import { validateLayout } from "@/lib/renderer/layout-validation";
import { webFormLeadLayout } from "@/lib/renderer/crm/settings/web-form-lead-layout";
import { toWebFormInput, toWebFormValues, webFormSchema } from "./web-form-schema";

const fields = [
  { name: "email", label: "Email", type: "email", required: true },
  { name: "size", label: "Size", type: "select", required: false, options: ["S", "M"] },
];

describe("web form editor", () => {
  it("round-trips a stored form and splits choices", () => {
    const values = toWebFormValues({
      id: 1, orgId: "o", name: "Contact", description: null, fields, publicToken: "t",
      isActive: true, submitMessage: "Thanks", redirectUrl: null, totalSubmissions: 0,
      createdBy: null, createdByMembershipId: null, createdAt: "", updatedAt: "",
    });
    expect(values.fields[1].options).toBe("S, M");
    expect(toWebFormInput(values, "update")).toEqual({
      name: "Contact", isActive: true, submitMessage: "Thanks", description: null, redirectUrl: null,
      fields: [
        { name: "email", label: "Email", type: "email", required: true },
        { name: "size", label: "Size", type: "select", required: false, options: ["S", "M"] },
      ],
    });
  });

  it("omits blanks on create and refuses duplicate keys and empty choices", () => {
    const values = toWebFormValues(null);
    expect(toWebFormInput({ ...values, name: "X" }, "create")).not.toHaveProperty("redirectUrl");
    const dup = webFormSchema.safeParse({
      ...values, name: "X",
      fields: [values.fields[0], values.fields[0], { name: "c", label: "C", type: "select", required: false, options: " , " }],
    });
    expect(dup.success).toBe(false);
    expect(dup.error?.issues.map((issue) => issue.path.join("."))).toEqual(["fields.1.name", "fields.2.options"]);
  });
});

describe("public lead form", () => {
  const layout = webFormLeadLayout({ name: "Contact", fields });

  it("describes the form's own fields to the renderer", () => {
    expect(validateLayout(layout)).toEqual([]);
    expect(layout.fields.map((field) => [field.name, field.kind])).toEqual([
      ["email", "email"],
      ["size", "select"],
    ]);
    expect(layout.fields[1].options).toEqual([
      { value: "S", label: "S" },
      { value: "M", label: "M" },
    ]);
  });

  it("requires required fields with the backend's wording", () => {
    const schema = schemaForLayout(layout, "create");
    const result = schema.safeParse({ email: "", size: "" });
    expect(result.error?.issues[0].message).toBe("Email is required");
    expect(schema.safeParse({ email: "not-an-email", size: "" }).error?.issues[0].message).toBe(
      "Enter a valid email address",
    );
    expect(schema.safeParse({ email: "a@b.co", size: "" }).success).toBe(true);
  });

  it("drops blank answers and follows only http(s) redirects", () => {
    expect(toLeadSubmission({ email: "a@b.co", size: " " })).toEqual({ email: "a@b.co" });
    expect(safeRedirect("javascript:alert(1)")).toBeNull();
    expect(safeRedirect("https://example.com/thanks")).toBe("https://example.com/thanks");
    expect(safeRedirect(null)).toBeNull();
  });
});
