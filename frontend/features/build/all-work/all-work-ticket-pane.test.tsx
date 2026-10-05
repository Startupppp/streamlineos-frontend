import React from "react";
import { render } from "@testing-library/react";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => (action: () => void) => action(),
}));

jest.mock("@/features/build/views/list-view", () => ({
  ListView: jest.fn(() => null),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPanel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("./project-chip", () => ({
  ProjectChip: () => null,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock("@/components/ui/truncated-text", () => ({
  TruncatedText: ({ text }: { text?: string | null }) => <span>{text}</span>,
}));

jest.mock("@/components/shared/format-ticket-key", () => ({
  getTicketDetailHref: (pid: number, key: string, num: number) =>
    `/build/${pid}/tickets/${key}-${num}`,
}));

import { AllWorkListSection } from "./all-work-list-section";
import { ListView } from "@/features/build/views/list-view";
import type { TicketGroup } from "./all-work-ticket-utils";

function makeGroup(): TicketGroup {
  return {
    id: "group-1",
    label: "Alpha",
    projectId: 1,
    projectKey: "AL",
    tickets: [
      {
        id: 10,
        title: "Ticket Alpha",
        status: "TODO",
        type: "TASK",
        priority: "MEDIUM",
        points: null,
        ticketNumber: 1,
        version: 1,
        assigneeId: null,
        cycleId: null,
        dueDate: null,
        startDate: null,
        assignee: null,
        labels: [],
        projectId: 1,
        projectKey: "AL",
        projectName: "Alpha",
        rank: "1000",
        epicId: null,
        estimate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}

describe("AllWorkListSection — pane navigation structure", () => {
  beforeEach(() => {
    mockPush.mockClear();
    jest.mocked(ListView).mockClear();
  });

  it("renders without crashing", () => {
    const { container } = render(
      <AllWorkListSection groups={[makeGroup()]} />,
    );
    expect(container).toBeDefined();
  });

  it("passes an onTicketClick handler to ListView", () => {
    render(
      <AllWorkListSection groups={[makeGroup()]} />,
    );
    expect(ListView).toHaveBeenCalledWith(
      expect.objectContaining({ onTicketClick: expect.any(Function) }),
      undefined,
    );
  });

  it("primary click on ticket navigates via router (pane or full-page — browser verification needed)", () => {
    render(
      <AllWorkListSection groups={[makeGroup()]} />,
    );
    const call = jest.mocked(ListView).mock.calls[0];
    const props = call?.[0];
    if (props?.onTicketClick) {
      props.onTicketClick(10);
      expect(mockPush).toHaveBeenCalledTimes(1);
    }
  });
});
