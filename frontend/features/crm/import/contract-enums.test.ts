import { EXPORT_ENTITIES } from "../../../types/crm/import";
import openapi from "../../../contracts/openapi.json";

type PathsRecord = typeof openapi.paths;
type PathKey = keyof PathsRecord;

function getQueryParamEnum(method: string, path: PathKey, paramName: string): string[] | undefined {
  const pathItem = openapi.paths[path] as Record<string, unknown>;
  const op = pathItem[method] as
    | { parameters?: Array<{ name?: string; in?: string; schema?: { enum?: string[] } }> }
    | undefined;
  const param = op?.parameters?.find((p) => p.name === paramName);
  return param?.schema?.enum;
}

describe("CRM export contract enum alignment", () => {
  const contractEntityEnum = getQueryParamEnum("get", "/crm/export", "entity");

  it("contract entity enum exists at GET /crm/export ?entity", () => {
    expect(contractEntityEnum).toBeDefined();
    expect(Array.isArray(contractEntityEnum)).toBe(true);
    expect((contractEntityEnum ?? []).length).toBeGreaterThan(0);
  });

  it("EXPORT_ENTITIES matches the OpenAPI contract entity enum exactly — both directions", () => {
    expect(contractEntityEnum).toBeDefined();
    const frontendEntities = [...EXPORT_ENTITIES] as string[];
    expect(frontendEntities.sort()).toEqual([...(contractEntityEnum ?? [])].sort());
  });
});
