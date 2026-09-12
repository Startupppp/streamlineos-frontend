/**
 * The acceptance the effective-access screen has to meet: what it DISPLAYS is
 * what `GET /roles/simulate/:targetUserId` RETURNED, key for key and scope for
 * scope. A provenance view that quietly renders a broader right than the API
 * grants is worse than no view at all, so the scope assertion below walks the
 * response rather than a hand-written expectation.
 */
import { render, screen, within } from "@testing-library/react";
import { expectNoAxeViolations } from "@/test-utils/axe";
import {
  simulatedAccessContract,
  type SimulatedAccess,
} from "@/hooks/api/roles-schema";
import { EffectiveAccessTable } from "./effective-access-table";
import {
  ModuleGrantabilityNote,
  ModuleStandingList,
  OrgStandingCard,
} from "./effective-access-standing";
import { SCOPE_LABELS } from "./effective-access-labels";

const FAR_FUTURE_ISO = "2027-03-01T00:00:00.000Z";

/** Shaped exactly as `simulateAccessResponseSchema` serialises it. */
const WIRE_RESPONSE = {
  userId: "user-1",
  permissions: [
    "crm:contacts:view",
    "crm:deals:update",
    "hr:employees:view",
    "inventory:items:view",
  ],
  scopes: {
    "crm:contacts:view": "all",
    "crm:deals:update": "team",
    "hr:employees:view": "own",
    "inventory:items:view": "all",
  },
  isOrgOwner: false,
  standing: "MEMBER",
  provenance: [
    {
      permissionKey: "crm:contacts:view",
      moduleKey: "crm",
      scope: "all",
      expiresAt: null,
      sources: [
        {
          kind: "role-grant",
          label: "CRM administrator",
          scope: "own",
          moduleKey: "crm",
          expiresAt: FAR_FUTURE_ISO,
        },
        {
          kind: "user-grant",
          label: "Direct grant to this person",
          scope: "all",
          moduleKey: "crm",
          expiresAt: null,
        },
      ],
    },
    {
      permissionKey: "crm:deals:update",
      moduleKey: "crm",
      scope: "team",
      expiresAt: FAR_FUTURE_ISO,
      sources: [
        {
          kind: "role-grant",
          label: "CRM administrator",
          scope: "team",
          moduleKey: "crm",
          expiresAt: FAR_FUTURE_ISO,
        },
      ],
    },
    {
      permissionKey: "hr:employees:view",
      moduleKey: "hr",
      scope: "own",
      expiresAt: FAR_FUTURE_ISO,
      sources: [
        {
          kind: "delegation",
          label: "Delegation",
          scope: "all",
          moduleKey: "hr",
          expiresAt: FAR_FUTURE_ISO,
        },
      ],
    },
    {
      permissionKey: "inventory:items:view",
      moduleKey: "inventory",
      scope: "all",
      expiresAt: null,
      sources: [
        {
          kind: "module-ownership",
          label: "Module ownership",
          scope: "all",
          moduleKey: "inventory",
          expiresAt: null,
        },
      ],
    },
  ],
  moduleStandings: [
    { moduleKey: "crm", standing: "member", available: true, permissionCount: 2 },
    { moduleKey: "hr", standing: "member", available: true, permissionCount: 1 },
    {
      moduleKey: "inventory",
      standing: "owner",
      available: false,
      permissionCount: 1,
    },
  ],
};

function parsedResponse(): SimulatedAccess {
  return simulatedAccessContract.parse(WIRE_RESPONSE);
}

function noop(): void {
  return undefined;
}

describe("effective-access contract", () => {
  it("accepts the simulate response shape the backend serialises", () => {
    expect(() => simulatedAccessContract.parse(WIRE_RESPONSE)).not.toThrow();
  });

  it("keeps a source scope of none representable even though an effective scope never is", () => {
    const withInertSource = {
      ...WIRE_RESPONSE,
      provenance: [
        {
          ...WIRE_RESPONSE.provenance[0],
          sources: [
            {
              ...WIRE_RESPONSE.provenance[0].sources[0],
              scope: "none",
            },
          ],
        },
      ],
    };
    expect(() => simulatedAccessContract.parse(withInertSource)).not.toThrow();
  });
});

describe("EffectiveAccessTable", () => {
  function renderTable(rows = parsedResponse().provenance, hasFilters = false) {
    return render(
      <EffectiveAccessTable
        rows={rows}
        isLoading={false}
        hasFilters={hasFilters}
        pageSize={25}
        onPageSizeChange={noop}
      />,
    );
  }

  it("shows a scope for every key that matches the effective scope map returned", () => {
    const access = parsedResponse();
    renderTable(access.provenance);

    for (const entry of access.provenance) {
      const effective = access.scopes[entry.permissionKey];
      expect(effective).toBeDefined();
      const cell = screen.getByText(entry.permissionKey).closest("tr");
      expect(cell).not.toBeNull();
      const row = within(cell as HTMLElement);
      const expected =
        effective === "team"
          ? "Team — behaves as Own"
          : SCOPE_LABELS[effective ?? "none"];
      expect(row.getByText(expected)).toBeInTheDocument();
    }
  });

  it("never presents team as broader than own, and says why in the UI", () => {
    renderTable();
    const badge = screen.getByText("Team — behaves as Own");
    expect(badge).toBeInTheDocument();
    expect(badge.getAttribute("title")).toContain("not implemented");
    expect(screen.queryByText("Team")).toBeNull();
  });

  it("names every source that produced a key, including the one that broadened it", () => {
    renderTable();
    const row = within(
      screen.getByText("crm:contacts:view").closest("tr") as HTMLElement,
    );
    expect(row.getByText("Role: CRM administrator")).toBeInTheDocument();
    expect(row.getByText("Direct grant")).toBeInTheDocument();
  });

  it("shows an expiry only for a key whose every source is time-bounded", () => {
    renderTable();
    const permanent = within(
      screen.getByText("crm:contacts:view").closest("tr") as HTMLElement,
    );
    expect(permanent.getByText("Never")).toBeInTheDocument();

    const expiring = within(
      screen.getByText("hr:employees:view").closest("tr") as HTMLElement,
    );
    expect(expiring.queryByText("Never")).toBeNull();
  });

  it("distinguishes a filter-empty result from a data-empty one", () => {
    const filtered = renderTable([], true);
    expect(screen.getByText("No matching permissions")).toBeInTheDocument();
    filtered.unmount();

    renderTable([], false);
    expect(screen.getByText("No effective permissions")).toBeInTheDocument();
  });

  it("renders a loading skeleton instead of rows while the read is in flight", () => {
    const { container } = render(
      <EffectiveAccessTable
        rows={[]}
        isLoading
        hasFilters={false}
        pageSize={25}
        onPageSizeChange={noop}
      />,
    );
    expect(screen.queryByText("No effective permissions")).toBeNull();
    expect(container.querySelectorAll("tr").length).toBeGreaterThan(1);
  });

  it("has no axe violations", async () => {
    const { container } = renderTable();
    await expectNoAxeViolations(container);
  });
});

describe("standing panels", () => {
  it("states the organization standing and what it implies", () => {
    render(
      <OrgStandingCard
        standing="ORG_ADMIN"
        personName="Ada Lovelace"
        permissionCount={4}
        isRefreshing={false}
      />,
    );
    expect(screen.getByText("Organization admin")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText(/Pending/)).toBeNull();
  });

  it("shows a pending state while the access read is being re-resolved", () => {
    render(
      <OrgStandingCard
        standing="MEMBER"
        personName="Ada Lovelace"
        permissionCount={4}
        isRefreshing
      />,
    );
    expect(
      screen.getByText("Pending — re-resolving access…"),
    ).toBeInTheDocument();
  });

  it("marks a module the organization never enabled as unavailable, not denied", () => {
    render(
      <ModuleStandingList
        moduleStandings={parsedResponse().moduleStandings}
      />,
    );
    expect(
      screen.getByText("Unavailable — module not enabled"),
    ).toBeInTheDocument();
    expect(screen.getByText("Module owner")).toBeInTheDocument();
  });

  it("offers only the standings the viewer may actually grant", () => {
    render(
      <ModuleGrantabilityNote
        moduleKey="crm"
        grantable={{
          grantableRanks: [20, 40],
          scopeCeiling: "own",
          canGrantModuleOwnership: false,
          isOrgOwner: false,
          isOrgAdmin: false,
        }}
        isPending={false}
        isError={false}
      />,
    );
    expect(
      screen.getByText("Module admin, Functional role"),
    ).toBeInTheDocument();
    expect(screen.getByText("Own records")).toBeInTheDocument();
  });

  it("says the viewer can grant nothing rather than offering an empty control", () => {
    render(
      <ModuleGrantabilityNote
        moduleKey="crm"
        grantable={{
          grantableRanks: [],
          scopeCeiling: "none",
          canGrantModuleOwnership: false,
          isOrgOwner: false,
          isOrgAdmin: false,
        }}
        isPending={false}
        isError={false}
      />,
    );
    expect(
      screen.getByText(/You cannot grant standing in CRM & Sales\./),
    ).toBeInTheDocument();
  });

  it("shows a pending state while the viewer's grant options are being read", () => {
    render(
      <ModuleGrantabilityNote
        moduleKey="crm"
        grantable={undefined}
        isPending
        isError={false}
      />,
    );
    expect(screen.getByText(/Pending — checking what you can grant/)).toBeInTheDocument();
  });

  it("fails closed when the grant options cannot be read", () => {
    render(
      <ModuleGrantabilityNote
        moduleKey="crm"
        grantable={undefined}
        isPending={false}
        isError
      />,
    );
    expect(
      screen.getByText(/could not be read, so none are offered here\./),
    ).toBeInTheDocument();
  });
});
