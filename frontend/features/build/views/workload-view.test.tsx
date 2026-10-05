import { render, screen } from "@testing-library/react";

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("./card-field-wrapper", () => ({ stopEvent: () => undefined }));
jest.mock("./card-field-assignee", () => ({ InlineAssignee: () => null }));

jest.mock("./ticket-quick-actions", () => ({
  TicketQuickActions: () => null,
}));

import { WorkloadView } from "./workload-view";
import { INITIAL_FILTERS, type MemberCapacityData } from "./workload-types";
import type { KanbanTicket } from "../shared/types";

const DAY_COLUMN_COUNT = 14;

const MEMBER = {
  id: "user-1",
  name: null,
  firstName: "Ada",
  lastName: "Lovelace",
  image: null,
};

const FULLY_FIGURED: MemberCapacityData = {
  capacityHours: 40,
  leaveDays: 0,
  loggedHours: 12,
  estimateHours: 20,
  allocationPercent: 50,
  varianceHours: -8,
  isOverAllocated: false,
  isZeroCapacity: false,
  utilizationPercent: 30,
};

const NO_ESTIMATE: MemberCapacityData = {
  capacityHours: 40,
  leaveDays: 0,
  loggedHours: 12,
  estimateHours: null,
  allocationPercent: null,
  varianceHours: null,
  isOverAllocated: false,
  isZeroCapacity: false,
  utilizationPercent: 30,
};

const noop = () => undefined;

function renderView(
  capacityData: MemberCapacityData | undefined,
  tickets: KanbanTicket[] = [],
) {
  const capacityByMemberId =
    capacityData === undefined
      ? undefined
      : new Map<string, MemberCapacityData>([[MEMBER.id, capacityData]]);
  return render(
    <WorkloadView
      tickets={tickets}
      projectId={1}
      projectKey="ENG"
      projectStatuses={[]}
      members={[MEMBER]}
      filters={INITIAL_FILTERS}
      onFilterChange={noop}
      onClearFilters={noop}
      capacityByMemberId={capacityByMemberId}
    />,
  );
}

describe("WorkloadView — allocation, estimate and variance columns exist as headers", () => {
  it("renders an Allocation, an Estimate and a Variance column header alongside the pre-existing Leave and Actual headers", () => {
    renderView(FULLY_FIGURED);

    expect(screen.getByText("Allocation")).toBeInTheDocument();
    expect(screen.getByText("Estimate")).toBeInTheDocument();
    expect(screen.getByText("Variance")).toBeInTheDocument();
    expect(screen.getByText("Leave")).toBeInTheDocument();
    expect(screen.getByText("Actual")).toBeInTheDocument();
  });
});

describe("WorkloadView — the three figures reach the rendered row, not just the hook", () => {
  it("renders allocationPercent as a percentage in the allocation cell", () => {
    renderView(FULLY_FIGURED);

    expect(screen.getByTestId("workload-allocation")).toHaveTextContent("50%");
  });

  it("renders estimateHours suffixed with h in the estimate cell", () => {
    renderView(FULLY_FIGURED);

    expect(screen.getByTestId("workload-estimate")).toHaveTextContent("20h");
  });

  it("renders a negative variance without a plus sign when fewer hours were logged than estimated", () => {
    renderView(FULLY_FIGURED);

    expect(screen.getByTestId("workload-variance")).toHaveTextContent("-8h");
  });

  it("renders a leading plus on the variance when more hours were logged than estimated, so overrun reads as overrun", () => {
    renderView({ ...FULLY_FIGURED, loggedHours: 24, varianceHours: 4 });

    expect(screen.getByTestId("workload-variance")).toHaveTextContent("+4h");
  });

  it("renders a plain zero variance when logged hours exactly match the estimate", () => {
    renderView({ ...FULLY_FIGURED, loggedHours: 20, varianceHours: 0 });

    expect(screen.getByTestId("workload-variance")).toHaveTextContent("0h");
  });

  it("renders an allocation above one hundred percent rather than clamping it, because over-allocation is the fact the page exists to show", () => {
    renderView({ ...FULLY_FIGURED, estimateHours: 60, allocationPercent: 150 });

    expect(screen.getByTestId("workload-allocation")).toHaveTextContent("150%");
  });

  it("renders a fractional allocation percentage unrounded to the integer, so a 32.5% load is not reported as 33%", () => {
    renderView({ ...FULLY_FIGURED, estimateHours: 13, allocationPercent: 32.5 });

    expect(screen.getByTestId("workload-allocation")).toHaveTextContent("32.5%");
  });
});

describe("WorkloadView — a null figure renders an em dash rather than a fabricated zero", () => {
  it("renders an em dash in all three cells when the member has no estimated open work, while the row itself still renders (positive control)", () => {
    renderView(NO_ESTIMATE);

    expect(screen.getByTestId("workload-member-row")).toBeInTheDocument();
    expect(screen.getByTestId("workload-allocation")).toHaveTextContent("—");
    expect(screen.getByTestId("workload-estimate")).toHaveTextContent("—");
    expect(screen.getByTestId("workload-variance")).toHaveTextContent("—");
  });

  it("does not render a zero in the estimate cell when estimateHours is null", () => {
    renderView(NO_ESTIMATE);

    expect(screen.getByTestId("workload-estimate")).not.toHaveTextContent("0h");
  });

  it("renders an em dash in all three cells when the capacity endpoint returned nothing for this member at all", () => {
    renderView(undefined);

    expect(screen.getByTestId("workload-member-row")).toBeInTheDocument();
    expect(screen.getByTestId("workload-allocation")).toHaveTextContent("—");
    expect(screen.getByTestId("workload-estimate")).toHaveTextContent("—");
    expect(screen.getByTestId("workload-variance")).toHaveTextContent("—");
  });

  it("renders a real zero estimate as 0h, which is a different fact from an absent estimate", () => {
    renderView({ ...FULLY_FIGURED, estimateHours: 0, allocationPercent: 0, varianceHours: 12 });

    expect(screen.getByTestId("workload-estimate")).toHaveTextContent("0h");
    expect(screen.getByTestId("workload-estimate")).not.toHaveTextContent("—");
  });
});

describe("WorkloadView — the member column shows a resolved display name, never the raw user id", () => {
  it("renders the member's resolved display name and initials rather than the user id", () => {
    renderView(FULLY_FIGURED);

    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders no element whose text is the raw user id", () => {
    renderView(FULLY_FIGURED);

    expect(screen.queryByText(MEMBER.id)).not.toBeInTheDocument();
  });
});

describe("WorkloadView — the unassigned row keeps the same fixed columns as a member row", () => {
  const unassignedTicket = {
    id: 9,
    title: "Nobody owns this",
    ticketNumber: 41,
    status: "TODO",
    assigneeId: null,
    points: null,
    dueDate: null,
    version: 1,
  } as unknown as KanbanTicket;

  it("gives the unassigned row one cell per fixed header column, so adding allocation, estimate and variance did not shear the two rows apart", () => {
    renderView(FULLY_FIGURED, [unassignedTicket]);

    const header = screen.getByTestId("workload-header-row");
    const unassigned = screen.getByTestId("workload-unassigned-row");

    expect(unassigned.children).toHaveLength(header.children.length - DAY_COLUMN_COUNT);
  });

  it("gives a member row the same total column count as the header (positive control for the count above)", () => {
    renderView(FULLY_FIGURED, [unassignedTicket]);

    const header = screen.getByTestId("workload-header-row");
    const memberRow = screen.getByTestId("workload-member-row");

    expect(memberRow.children).toHaveLength(header.children.length);
  });
});

const TEAM_MEMBERS = [
  MEMBER,
  { id: "user-2", name: null, firstName: "Grace", lastName: "Hopper", image: null },
  { id: "user-3", name: null, firstName: "Alan", lastName: "Turing", image: null },
];

function capacityWithTeams(
  teamsByMemberId: Record<string, { id: number; name: string }[]>,
): Map<string, MemberCapacityData> {
  return new Map(
    Object.entries(teamsByMemberId).map(([memberId, teams]) => [
      memberId,
      { ...FULLY_FIGURED, teams },
    ]),
  );
}

function renderGrouped(
  group: "none" | "team",
  capacityByMemberId: Map<string, MemberCapacityData>,
) {
  return render(
    <WorkloadView
      tickets={[]}
      projectId={1}
      projectKey="ENG"
      projectStatuses={[]}
      members={TEAM_MEMBERS}
      filters={INITIAL_FILTERS}
      onFilterChange={noop}
      onClearFilters={noop}
      capacityByMemberId={capacityByMemberId}
      group={group}
    />,
  );
}

describe("WorkloadView — group axis", () => {
  it("renders no group caption when grouping is off, so the ungrouped table is unchanged", () => {
    renderGrouped(
      "none",
      capacityWithTeams({ "user-1": [{ id: 4, name: "Platform" }] }),
    );
    expect(screen.queryByTestId("workload-group-caption")).not.toBeInTheDocument();
    expect(screen.getAllByTestId("workload-member-row")).toHaveLength(3);
  });

  it("captions one section per team, in name order, when grouping by team", () => {
    renderGrouped(
      "team",
      capacityWithTeams({
        "user-1": [{ id: 4, name: "Platform" }],
        "user-2": [{ id: 9, name: "Billing" }],
        "user-3": [{ id: 9, name: "Billing" }],
      }),
    );
    const captions = screen.getAllByTestId("workload-group-caption");
    expect(captions.map((c) => c.textContent)).toEqual(["Billing2", "Platform1"]);
  });

  it("lists a member under every team they belong to, rather than silently picking one", () => {
    renderGrouped(
      "team",
      capacityWithTeams({
        "user-1": [
          { id: 4, name: "Platform" },
          { id: 9, name: "Billing" },
        ],
        "user-2": [],
        "user-3": [],
      }),
    );
    const captions = screen.getAllByTestId("workload-group-caption");
    expect(captions.map((c) => c.textContent)).toEqual(["Billing1", "Platform1", "No team2"]);
    expect(screen.getAllByTestId("workload-member-row")).toHaveLength(4);
  });

  it("puts members on no team in a No team section last, so grouping never drops a row", () => {
    renderGrouped("team", capacityWithTeams({ "user-1": [], "user-2": [], "user-3": [] }));
    const captions = screen.getAllByTestId("workload-group-caption");
    expect(captions.map((c) => c.textContent)).toEqual(["No team3"]);
    expect(screen.getAllByTestId("workload-member-row")).toHaveLength(3);
  });

  it("groups members whose capacity row predates the team field into No team instead of throwing", () => {
    renderGrouped("team", new Map([[MEMBER.id, NO_ESTIMATE]]));
    expect(screen.getAllByTestId("workload-group-caption").map((c) => c.textContent)).toEqual([
      "No team3",
    ]);
  });
});
