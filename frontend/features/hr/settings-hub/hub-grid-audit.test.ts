import { existsSync, readFileSync } from "node:fs";
import { CARD_GROUPS } from "@/features/hr/settings-hub/hub-grid";

const ROUTE_ROOT = "app/(authenticated)";

function routeExists(href: string): boolean {
  const path = href.split("?")[0].replace(/\/$/, "");
  return (
    existsSync(`${ROUTE_ROOT}${path}/page.tsx`) ||
    existsSync(`${ROUTE_ROOT}${path}/page.ts`)
  );
}

const ALL_CARDS = CARD_GROUPS.flatMap((group) =>
  group.cards.map((card) => ({ ...card, group: group.group })),
);

describe("HRMS-UX-016 — every hub card resolves to a real route", () => {
  it.each(ALL_CARDS.map((card) => [card.title, card.href] as const))(
    "%s → %s",
    (_title, href) => {
      expect(routeExists(href)).toBe(true);
    },
  );
});

describe("HRMS-UX-016 — D12: no customer path to /hr/settings/company", () => {
  it("no hub card points at the company shim", () => {
    expect(ALL_CARDS.some((card) => card.href.startsWith("/hr/settings/company"))).toBe(
      false,
    );
  });

  it("the shim route does not exist and is redirected to the canonical org settings", () => {
    expect(existsSync(`${ROUTE_ROOT}/hr/settings/company/page.tsx`)).toBe(false);
    const config = readFileSync("next.config.ts", "utf8");
    const shim = config.slice(config.indexOf('source: "/hr/settings/company"'));
    expect(shim.slice(0, 300)).toContain("/settings/organization");
  });

  it("company-level configuration is reached through the canonical organization settings", () => {
    const company = ALL_CARDS.find((card) => card.title === "Company Profile");
    expect(company?.href).toBe("/settings/organization");
  });
});

describe("HRMS-UX-016 — H4: the simulator is not in the customer hub", () => {
  it("no hub card points at /hr/simulator", () => {
    expect(ALL_CARDS.some((card) => card.href.startsWith("/hr/simulator"))).toBe(false);
  });
});

describe("HRMS-UX-016 — a 10-50 tenant sees a short, useful simple list", () => {
  const simple = ALL_CARDS.filter((card) => card.advanced !== true);

  it("keeps policies, workflows, forms, custom fields and import/export prominent", () => {
    for (const title of [
      "HR Policies",
      "Workflows",
      "Forms",
      "Custom Fields",
      "Import / Export",
    ])
      expect(simple.map((card) => card.title)).toContain(title);
  });

  it("buries automations and version history in advanced", () => {
    for (const title of ["Automations", "Version History"])
      expect(simple.map((card) => card.title)).not.toContain(title);
  });

  it("stays short enough to scan", () => {
    expect(simple.length).toBeLessThanOrEqual(13);
  });
});
