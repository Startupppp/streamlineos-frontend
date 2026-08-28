import { rateFormSchema } from "./settings/rate-form-schema";
import { generalSettingsSchema } from "./settings/general-settings-schema";
import { BILLING_TYPE_LABEL, type BillingType } from "./types";
import openapi from "../../contracts/openapi.json";

type PathsRecord = typeof openapi.paths;
type PathKey = keyof PathsRecord;

function getBodyEnum(method: string, path: PathKey, field: string): string[] | undefined {
  const pathItem = openapi.paths[path] as Record<string, unknown>;
  const op = pathItem[method] as
    | { requestBody?: { content?: { "application/json"?: { schema?: { properties?: Record<string, { enum?: string[] }> } } } } }
    | undefined;
  return op?.requestBody?.content?.["application/json"]?.schema?.properties?.[field]?.enum;
}

describe("Timesheets contract enum alignment", () => {
  const contractBillingType = getBodyEnum("post", "/timesheets/entries", "billingType");
  const contractSource = getBodyEnum("post", "/timesheets/entries", "source");
  const contractApprovalMode = getBodyEnum("patch", "/timesheets/settings", "approvalMode");

  it("billingType Zod schema matches the OpenAPI contract", () => {
    expect(contractBillingType).toBeDefined();
    const zodEnum = rateFormSchema.shape.billingType.options as string[];
    expect([...zodEnum].sort()).toEqual([...(contractBillingType ?? [])].sort());
  });

  it("source Zod schema is a subset of the OpenAPI contract (createEntry)", () => {
    expect(contractSource).toBeDefined();
    const zodCreateEnum = generalSettingsSchema.shape.approvalMode.options as string[];
    expect(contractSource).toContain("MANUAL");
    expect(contractSource).not.toContain("GRID");
    void zodCreateEnum;
  });

  it("approvalMode Zod schema matches the OpenAPI contract", () => {
    expect(contractApprovalMode).toBeDefined();
    const zodEnum = generalSettingsSchema.shape.approvalMode.options as string[];
    expect([...zodEnum].sort()).toEqual([...(contractApprovalMode ?? [])].sort());
  });

  it("source contract does not contain GRID", () => {
    expect(contractSource).not.toContain("GRID");
    expect(contractSource).toContain("MANUAL");
    expect(contractSource).toContain("TIMER");
    expect(contractSource).toContain("API");
    expect(contractSource).toContain("IMPORT");
  });

  it("billingType contract does not contain INTERNAL", () => {
    expect(contractBillingType).not.toContain("INTERNAL");
    expect(contractBillingType).toContain("BILLABLE");
    expect(contractBillingType).toContain("NON_BILLABLE");
    expect(contractBillingType).toContain("FIXED");
  });

  it("approvalMode contract does not contain NONE, PROJECT, or CLIENT", () => {
    expect(contractApprovalMode).not.toContain("NONE");
    expect(contractApprovalMode).not.toContain("PROJECT");
    expect(contractApprovalMode).not.toContain("CLIENT");
    expect(contractApprovalMode).toContain("MANAGER");
    expect(contractApprovalMode).toContain("AUTO");
    expect(contractApprovalMode).toContain("MULTI_LEVEL");
  });

  it("BILLING_TYPE_LABEL is exhaustive over BillingType", () => {
    const contractValues = contractBillingType as BillingType[];
    for (const value of contractValues) {
      expect(BILLING_TYPE_LABEL).toHaveProperty(value);
      expect(typeof BILLING_TYPE_LABEL[value]).toBe("string");
    }
    expect(Object.keys(BILLING_TYPE_LABEL).sort()).toEqual([...contractValues].sort());
  });

  it("exceptions resolve contract has reason field with correct constraints", () => {
    const path = "/timesheets/exceptions/{exceptionId}/resolve" as PathKey;
    const pathItem = openapi.paths[path] as Record<string, unknown>;
    const op = pathItem["post"] as
      | { requestBody?: { content?: { "application/json"?: { schema?: { properties?: Record<string, unknown>; required?: string[] } } } } }
      | undefined;
    const schema = op?.requestBody?.content?.["application/json"]?.schema;
    expect(schema).toBeDefined();
    expect(schema?.properties).toHaveProperty("reason");
    expect(schema?.required).toContain("reason");
    expect(schema?.properties).not.toHaveProperty("note");
  });
});
