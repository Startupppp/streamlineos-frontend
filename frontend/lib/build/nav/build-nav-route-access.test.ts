import { resolveRouteAccess } from "@/lib/rbac/route-access/route-access";
import { buildOrganizationCatalog } from "./build-organization-catalog";
import { buildProjectCatalog } from "./build-project-catalog";

describe("BLD-L4-001 — org settings routes resolve to permission via nav catalog (not unknown)", () => {
  it("resolveRouteAccess returns permission for /build/settings/access once org-members destination points there", () => {
    const decision = resolveRouteAccess("/build/settings/access");
    expect(decision.kind).toBe("permission");
  });

  it("resolveRouteAccess returns permission for /build/settings/client-access once org-client-access destination points there", () => {
    const decision = resolveRouteAccess("/build/settings/client-access");
    expect(decision.kind).toBe("permission");
  });

  it("org-members destination points to the canonical /build/settings/access route so the nav does not link to an access-denied wall", () => {
    const catalog = buildOrganizationCatalog();
    const members = catalog.moreTools.find((d) => d.id === "org-members");
    expect(members?.href).toBe("/build/settings/access");
  });

  it("org-client-access destination points to the canonical /build/settings/client-access route", () => {
    const catalog = buildOrganizationCatalog();
    const clientAccess = catalog.moreTools.find((d) => d.id === "org-client-access");
    expect(clientAccess?.href).toBe("/build/settings/client-access");
  });

  it("org-members destination carries a union permission covering both members:view and access:view so FE-54 is not violated and neither group is stranded", () => {
    const catalog = buildOrganizationCatalog();
    const members = catalog.moreTools.find((d) => d.id === "org-members");
    const permission = members?.requiredPermission;
    expect(Array.isArray(permission)).toBe(true);
    const keys = permission as string[];
    expect(keys).toContain("build:members:view");
    expect(keys).toContain("build:access:view");
  });

  it("org-client-access destination still carries a requiredPermission so FE-54 is not violated", () => {
    const catalog = buildOrganizationCatalog();
    const clientAccess = catalog.moreTools.find((d) => d.id === "org-client-access");
    expect(clientAccess?.requiredPermission).toBeTruthy();
  });

  it("org-access destination was removed from the catalog so the dedup cannot produce permission drift", () => {
    const catalog = buildOrganizationCatalog();
    const orgAccess = catalog.moreTools.find((d) => d.id === "org-access");
    expect(orgAccess).toBeUndefined();
  });
});

describe("BLD-L4-001 — project settings sub-routes inherit access via extension prefix", () => {
  it("resolveRouteAccess returns permission for /build/[projectId]/settings/workflow via prefix extension", () => {
    const decision = resolveRouteAccess("/build/[projectId]/settings/workflow");
    expect(decision.kind).toBe("permission");
  });

  it("resolveRouteAccess returns permission for /build/[projectId]/settings/automations via prefix extension", () => {
    const decision = resolveRouteAccess("/build/[projectId]/settings/automations");
    expect(decision.kind).toBe("permission");
  });

  it("resolveRouteAccess returns permission for /build/[projectId]/settings/integrations/webhooks via prefix extension", () => {
    const decision = resolveRouteAccess("/build/[projectId]/settings/integrations/webhooks");
    expect(decision.kind).toBe("permission");
  });

  it("project-workflow destination points to the canonical settings/workflow route", () => {
    const catalog = buildProjectCatalog("/build/42");
    const workflow = catalog.moreTools.find((d) => d.id === "project-workflow");
    expect(workflow?.href).toBe("/build/42/settings/workflow");
  });

  it("project-automations destination points to the canonical settings/automations route", () => {
    const catalog = buildProjectCatalog("/build/42");
    const automations = catalog.moreTools.find((d) => d.id === "project-automations");
    expect(automations?.href).toBe("/build/42/settings/automations");
  });

  it("project-webhooks destination points to the canonical settings/integrations/webhooks route", () => {
    const catalog = buildProjectCatalog("/build/42");
    const webhooks = catalog.moreTools.find((d) => d.id === "project-webhooks");
    expect(webhooks?.href).toBe("/build/42/settings/integrations/webhooks");
  });

  it("project-workflow permission is build:update to match the /build/[projectId]/settings extension so no parity drift occurs", () => {
    const catalog = buildProjectCatalog("/build/42");
    const workflow = catalog.moreTools.find((d) => d.id === "project-workflow");
    expect(workflow?.requiredPermission).toBe("build:update");
  });

  it("project-automations permission is build:update to match the /build/[projectId]/settings extension so no parity drift occurs", () => {
    const catalog = buildProjectCatalog("/build/42");
    const automations = catalog.moreTools.find((d) => d.id === "project-automations");
    expect(automations?.requiredPermission).toBe("build:update");
  });

  it("project-webhooks permission is build:update to match the /build/[projectId]/settings extension so no parity drift occurs", () => {
    const catalog = buildProjectCatalog("/build/42");
    const webhooks = catalog.moreTools.find((d) => d.id === "project-webhooks");
    expect(webhooks?.requiredPermission).toBe("build:update");
  });
});
