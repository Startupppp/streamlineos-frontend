import { render, screen } from "@testing-library/react";
import { MeetingsListPage } from "./meetings-list-page";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/build", () => ({
  useMeetings: jest.fn(),
  useCreateMeeting: jest.fn(),
  useProjectMembers: jest.fn(),
  useCycles: jest.fn(),
  useProjectBoardTickets: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
  useAccess: jest.fn(),
}));

jest.mock("@/hooks/api/entitlements", () => ({
  useEntitlements: () => ({ data: undefined }),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div>
      {title ? <h1>{title}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({ permission }: { permission?: string }) => (
    <div data-testid="no-permission">{permission}</div>
  ),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: ({ description }: { description?: string }) => (
    <div data-testid="error-state">{description}</div>
  ),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title?: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: () => <div data-testid="data-table" />,
  DataTableSkeleton: () => <div data-testid="data-table-skeleton" />,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmSection: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "",
}));

jest.mock("@/components/ui/content-fill-panel", () => ({
  FILTER_TOOLBAR_ROW: "",
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/combobox", () => ({
  Combobox: () => null,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick }: { children?: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

jest.mock("./meeting-form-sheet", () => ({
  MeetingFormSheet: () => null,
}));

jest.mock("./new-meeting-button", () => ({
  NewMeetingButton: () => null,
  MEETING_TEMPLATES: [],
}));

jest.mock("./next-meeting-strip", () => ({
  NextMeetingStrip: () => null,
}));

jest.mock("./meetings-columns", () => ({
  buildMeetingsColumns: () => [],
}));

jest.mock("./generate-agenda", () => ({
  generateAgenda: () => "",
}));

jest.mock("@/lib/person-display", () => ({
  getUserDisplayName: () => "User",
}));

import {
  useMeetings,
  useCreateMeeting,
  useProjectMembers,
  useCycles,
  useProjectBoardTickets,
} from "@/hooks/api/build";
import { useCan, useAccess } from "@/hooks/api/access";

const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => "/build",
  useSearchParams: () => mockSearchParams,
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockSearchParams = new URLSearchParams();
});


const mockUseMeetings = useMeetings as jest.Mock;
const mockUseCreateMeeting = useCreateMeeting as jest.Mock;
const mockUseProjectMembers = useProjectMembers as jest.Mock;
const mockUseCycles = useCycles as jest.Mock;
const mockUseProjectBoardTickets = useProjectBoardTickets as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseAccess = useAccess as jest.Mock;

const ACCESS_GRANTED = {
  data: { isOrgOwner: false, scopes: { "build:meetings:view": "all", "build:meetings:manage": "all" }, modules: {} },
  isLoading: false,
};

const ACCESS_DENIED = {
  data: { isOrgOwner: false, scopes: {}, modules: {} },
  isLoading: false,
};

function baseMeetingsResult(overrides = {}) {
  return {
    data: [],
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseAccess.mockReturnValue(ACCESS_GRANTED);
  mockUseMeetings.mockReturnValue(baseMeetingsResult());
  mockUseCreateMeeting.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseProjectMembers.mockReturnValue({ data: [] });
  mockUseCycles.mockReturnValue({ data: [] });
  mockUseProjectBoardTickets.mockReturnValue({ data: undefined });
});

it("renders denied state when build:meetings:view is not in the access snapshot", () => {
  mockUseAccess.mockReturnValue(ACCESS_DENIED);
  render(<MeetingsListPage projectId={1} />);
  expect(screen.getByTestId("no-permission")).toHaveTextContent("build:meetings:view");
});

it("shows the skeleton and not a denial while the access snapshot is still in flight because useCan answers false before it lands", () => {
  mockUseAccess.mockReturnValue({ data: undefined, isLoading: true });
  mockUseCan.mockReturnValue(false);
  render(<MeetingsListPage projectId={1} />);
  expect(screen.queryByTestId("no-permission")).not.toBeInTheDocument();
  expect(screen.getByTestId("data-table-skeleton")).toBeInTheDocument();
});

it("renders the plan upgrade link the backend sent with a 402 MODULE_NOT_ENABLED instead of a generic error", () => {
  mockUseMeetings.mockReturnValue(
    baseMeetingsResult({
      isError: true,
      error: new ApiError(
        "Build is not included in your current plan.",
        402,
        "MODULE_NOT_ENABLED",
        { moduleKey: "build", reason: "not-in-plan", upgradePath: "/settings/billing" },
      ),
    }),
  );
  render(<MeetingsListPage projectId={1} />);
  expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /view plans/i })).toHaveAttribute("href", "/settings/billing");
});
