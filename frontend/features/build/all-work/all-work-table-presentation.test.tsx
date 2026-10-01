import React from "react";
import { render } from "@testing-library/react";
import type { AllWorkTicket } from "@/types/projects";

const dataTableProps = jest.fn();

jest.mock("@/components/ui/data-table", () => ({
  DataTable: (props: unknown) => {
    dataTableProps(props);
    return <div data-testid="data-table" />;
  },
}));

import { AllWorkTableSection } from "./all-work-table-section";

const TICKET: AllWorkTicket = {
  id: 10,
  title: "A very long but meaningful ticket title",
  type: "TASK",
  status: "IN_PROGRESS",
  priority: "HIGH",
  projectId: 1,
  projectKey: "STRE",
  projectName: "StreamlineOS",
  ticketNumber: 42,
  epicId: null,
  assigneeId: "user-1",
  points: 3,
  estimate: null,
  version: 1,
  rank: null,
  startDate: null,
  dueDate: "2026-10-01T00:00:00.000Z",
  cycleId: null,
  createdAt: null,
  updatedAt: null,
  assignee: {
    id: "user-1",
    name: "Ada Lovelace",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    image: null,
  },
  labels: [],
};

describe("AllWorkTableSection presentation contract", () => {
  beforeEach(() => dataTableProps.mockClear());

  it("keeps project-qualified identity and a mobile card adapter", () => {
    render(
      <AllWorkTableSection
        tickets={[TICKET]}
        tableSelection={new Set()}
        onSelectionChange={jest.fn()}
        onTicketClick={jest.fn()}
      />,
    );

    const props = dataTableProps.mock.calls[0]?.[0] as {
      data: Array<{ projectKey?: string; ticketNumber: number }>;
      minWidth: string;
      mobileCard: (row: unknown) => React.ReactNode;
    };
    expect(props.data[0]).toEqual(expect.objectContaining({ projectKey: "STRE", ticketNumber: 42 }));
    expect(props.minWidth).toBe("640px");
    expect(typeof props.mobileCard).toBe("function");
  });
});
