import type { ReactNode } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useOneOnOneMeetings } from "@/hooks/api/hr";

/**
 * PageState renders only its `empty` slot when the resolution is empty. The
 * create sheet once lived inside PageState's children, so on an organisation
 * with no meetings the empty state's "Schedule 1-on-1" set the open flag on a
 * sheet that was never mounted — nobody could create the first one. The same
 * shape was fixed in the cycles, goals, PIP and succession tabs.
 */
jest.mock("@/hooks/api/use-page-state", () => {
  const { resolvePageState } = jest.requireActual<typeof import("@/lib/page-state/resolve-page-state")>(
    "@/lib/page-state/resolve-page-state",
  );
  return {
    usePageState: (options: Omit<Parameters<typeof resolvePageState>[0], "access">) =>
      resolvePageState({ ...options, access: "granted" }),
  };
});

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/hr", () => ({
  useOneOnOneMeetings: jest.fn(),
  useCreateOneOnOne: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateOneOnOne: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeleteOneOnOne: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/components/shared/hr-sheet", () => ({
  HrSheet: ({ open, title }: { open: boolean; title: string; children?: ReactNode }) =>
    open ? <div role="dialog" aria-label={title} /> : null,
}));

jest.mock("@/components/ui/confirm-sheet", () => ({
  ConfirmSheet: () => null,
}));

jest.mock("@/features/hr/shared/employee-picker", () => ({
  EmployeePicker: () => null,
}));

jest.mock("@/components/illustrations", () => ({
  EmptyTeamIllustration: () => null,
}));

import { MeetingsTab } from "./meetings-tab";

const mockedMeetings = jest.mocked(useOneOnOneMeetings);

function withMeetings(data: unknown[]) {
  mockedMeetings.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  } as unknown as ReturnType<typeof useOneOnOneMeetings>);
}

describe("MeetingsTab with no meetings yet", () => {
  it("opens the schedule sheet from the empty state's action", () => {
    withMeetings([]);
    render(<MeetingsTab />);

    expect(screen.queryByRole("dialog", { name: "Schedule 1-on-1" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Schedule 1-on-1" }));

    expect(screen.getByRole("dialog", { name: "Schedule 1-on-1" })).toBeInTheDocument();
  });
});
