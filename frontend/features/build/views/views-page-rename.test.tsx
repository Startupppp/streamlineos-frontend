import React, { Suspense } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";

const mockUpdateMutate = jest.fn();

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(true),
  useAccess: jest
    .fn()
    .mockReturnValue({ data: { permissions: ["build:view"], modules: {} }, isLoading: false }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn().mockReturnValue({ data: undefined }),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: () => ({ kind: "ready" }),
}));

jest.mock("@/hooks/api/build", () => ({
  useViews: jest.fn().mockReturnValue({
    data: [
      {
        id: 4,
        name: "Sprint board",
        layoutType: "board",
        isPinned: false,
        filters: { status: "Todo" },
        visibility: "shared",
      },
    ],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
  }),
  useUpdateView: jest
    .fn()
    .mockImplementation(() => ({ mutate: mockUpdateMutate, isPending: false })),
  useDeleteView: jest
    .fn()
    .mockReturnValue({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({ data: { user: { id: "u1" } } }),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue({ push: jest.fn() }),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    actions,
  }: {
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <div>
      {actions}
      {children}
    </div>
  ),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "fill-panel",
  PM_ROW: "pm-row",
}));

jest.mock("@/features/build/views/saved-views/create-view-sheet", () => ({
  CreateViewSheet: () => null,
}));

jest.mock("@/components/illustrations", () => ({
  EmptySearchIllustration: () => <div />,
}));

jest.mock("@animateicons/react/lucide", () => ({
  Trash2Icon: () => null,
}));

jest.mock("@/components/ui/animated-icon-button", () => ({
  AnimatedIconButton: ({ "aria-label": label }: { "aria-label"?: string }) => (
    <button type="button" aria-label={label} />
  ),
}));

import { ViewsPage } from "./views-page";

beforeEach(() => {
  mockUpdateMutate.mockClear();
});

describe("ViewsPage — a saved view can be renamed without being deleted and recreated", () => {
  it("patches the view's name so the rename survives, instead of only ever sending isPinned", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <ViewsPage params={Promise.resolve({ projectId: "7" })} />
        </Suspense>,
      );
    });

    await user.click(screen.getByRole("button", { name: /rename saved view/i }));

    const input = await screen.findByLabelText(/view name/i);
    await user.clear(input);
    await user.type(input, "Renamed board");
    await user.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(mockUpdateMutate).toHaveBeenCalledTimes(1));
    expect(mockUpdateMutate.mock.calls[0][0]).toEqual({
      viewId: 4,
      projectId: 7,
      name: "Renamed board",
    });
  });

  it("keeps the rename dialog seeded with the current name so an accidental save is a no-op", async () => {
    const user = userEvent.setup();

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <ViewsPage params={Promise.resolve({ projectId: "7" })} />
        </Suspense>,
      );
    });

    await user.click(screen.getByRole("button", { name: /rename saved view/i }));

    expect(await screen.findByDisplayValue("Sprint board")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^save$/i })).toBeDisabled(),
    );
  });
});
