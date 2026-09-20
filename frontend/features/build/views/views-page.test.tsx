import React, { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { ViewsPage } from "./views-page";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn().mockReturnValue(false),
  useAccess: jest.fn().mockReturnValue({ data: undefined, isLoading: true }),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: jest.fn().mockReturnValue({ data: undefined }),
}));

jest.mock("@/hooks/api/build", () => ({
  useViews: jest.fn().mockReturnValue({ data: undefined, isLoading: false, isError: false, error: undefined, refetch: jest.fn() }),
  useUpdateView: jest.fn().mockReturnValue({ mutate: jest.fn(), isPending: false }),
  useDeleteView: jest.fn().mockReturnValue({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({ data: null }),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue({ push: jest.fn() }),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title && <h1>{title}</h1>}
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
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => <div data-testid="skeleton" className={className} />,
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => <div data-testid="error-state" />,
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution }: { resolution: { kind: string } }) => (
    <div data-testid={`page-state-${resolution.kind}`} />
  ),
}));

jest.mock("@/components/illustrations", () => ({
  EmptySearchIllustration: () => <div />,
}));

jest.mock("@/lib/text-overflow", () => ({ TEXT_ONE_LINE: "truncate" }));

jest.mock("@/features/build/views/saved-views/view-card", () => ({
  ViewCard: () => null,
}));

jest.mock("@/features/build/views/saved-views/create-view-sheet", () => ({
  CreateViewSheet: () => null,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

describe("ViewsPage — access snapshot loading shows loading skeleton (not empty state)", () => {
  it("shows a loading skeleton while the access snapshot is in flight, not the no-saved-views empty state", async () => {
    await act(async () => {
      render(
        <Suspense fallback={<div data-testid="suspense-fallback" />}>
          <ViewsPage params={Promise.resolve({ projectId: "1" })} />
        </Suspense>,
      );
    });

    expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
