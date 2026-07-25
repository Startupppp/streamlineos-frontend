import { render as rtlRender, screen, fireEvent } from "@testing-library/react";
import type { ReactElement } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

function render(ui: ReactElement) {
  return rtlRender(<TooltipProvider>{ui}</TooltipProvider>);
}
import { HrSetupClient } from "../hr-setup-client";
import { useCan } from "@/hooks/api/access";
import {
  useModuleChecklist,
  useSkipChecklistItem,
  useRestartModuleChecklist,
  useDismissTour,
  useDismissModuleChecklist,
  useSaveTourProgress,
} from "@/hooks/api/onboarding-flow";

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/hooks/api/onboarding-flow", () => ({
  useModuleChecklist: jest.fn(),
  useSkipChecklistItem: jest.fn(),
  useRestartModuleChecklist: jest.fn(),
  useDismissTour: jest.fn(),
  useDismissModuleChecklist: jest.fn(),
  useSaveTourProgress: jest.fn(),
}));

const push = jest.fn();
const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/hr/setup",
}));

const refetch = jest.fn();

function pendingMutation() {
  return { mutateAsync: jest.fn().mockResolvedValue({}), isPending: false };
}

describe("HrSetupClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCan as jest.Mock).mockReturnValue(true);
    (useSkipChecklistItem as jest.Mock).mockReturnValue(pendingMutation());
    (useRestartModuleChecklist as jest.Mock).mockReturnValue(pendingMutation());
    (useDismissTour as jest.Mock).mockReturnValue(pendingMutation());
    (useDismissModuleChecklist as jest.Mock).mockReturnValue(pendingMutation());
    (useSaveTourProgress as jest.Mock).mockReturnValue(pendingMutation());
  });

  it("shows a loading skeleton, not a bare spinner, while the checklist loads", () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch });
    render(<HrSetupClient />);
    expect(screen.queryByText(/completed/)).not.toBeInTheDocument();
    expect(document.querySelectorAll('[class*="animate-pulse"]').length).toBeGreaterThan(0);
  });

  it("shows an error state with a working retry action", () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    });
    render(<HrSetupClient />);
    expect(screen.getByText(/Couldn't load your setup checklist/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("renders each checklist item with its title and required/optional state", () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({
      data: {
        id: 1,
        moduleKey: "HR",
        status: "in_progress",
        progress: 50,
        items: [
          { itemKey: "org_profile", title: "Organization profile", description: null, actionHref: "/settings/organization", status: "done", required: true, sortOrder: 0 },
          { itemKey: "recruitment_setup", title: "Recruitment setup", description: null, actionHref: "/hr/recruitment/settings", status: "todo", required: false, sortOrder: 1 },
        ],
      },
      isLoading: false,
      isError: false,
      refetch,
    });
    render(<HrSetupClient />);
    expect(screen.getByText("Organization profile")).toBeInTheDocument();
    expect(screen.getByText("Recruitment setup")).toBeInTheDocument();
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("shows the completion summary with quick links once every required item is done", () => {
    (useModuleChecklist as jest.Mock).mockReturnValue({
      data: {
        id: 1,
        moduleKey: "HR",
        status: "completed",
        progress: 100,
        items: [
          { itemKey: "org_profile", title: "Organization profile", description: null, actionHref: "/settings/organization", status: "done", required: true, sortOrder: 0 },
        ],
      },
      isLoading: false,
      isError: false,
      refetch,
    });
    render(<HrSetupClient />);
    expect(screen.getByText("Your HR workspace is ready to go")).toBeInTheDocument();
    expect(screen.getByText("Employees")).toBeInTheDocument();
    expect(screen.getByText("Payroll")).toBeInTheDocument();
  });

  it("hides manage-only actions (skip, restart, finish later) for a view-only HR user", () => {
    (useCan as jest.Mock).mockReturnValue(false);
    (useModuleChecklist as jest.Mock).mockReturnValue({
      data: {
        id: 1,
        moduleKey: "HR",
        status: "in_progress",
        progress: 0,
        items: [
          { itemKey: "recruitment_setup", title: "Recruitment setup", description: null, actionHref: "/hr/recruitment/settings", status: "todo", required: false, sortOrder: 0 },
        ],
      },
      isLoading: false,
      isError: false,
      refetch,
    });
    render(<HrSetupClient />);
    expect(screen.queryByRole("button", { name: "Skip" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Finish setup later" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Restart setup/ })).not.toBeInTheDocument();
  });
});
