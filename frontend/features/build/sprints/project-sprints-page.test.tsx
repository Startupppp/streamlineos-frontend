import { render, screen } from "@testing-library/react";
import { ProjectSprintsPage } from "./project-sprints-page";

jest.mock("@/hooks/api/build", () => ({
  useSprints: jest.fn(),
  useProject: jest.fn(),
  useUpdateSprint: jest.fn(),
  useUpdateTicket: jest.fn(),
  useProjectBoardTickets: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("./use-sprint-ticket-mover", () => ({
  useSprintTicketMover: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => <div {...rest}>{children}</div>,
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

jest.mock("@/components/pm-chrome", () => ({
  PmPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PM_FILL_PANEL: "pm-fill-panel",
}));

jest.mock("./create-sprint-dialog", () => ({
  CreateSprintDialog: () => <button data-testid="create-sprint-btn">Create Sprint</button>,
}));

jest.mock("./complete-sprint-sheet", () => ({
  CompleteSprintSheet: () => null,
}));

jest.mock("./sprint-sections", () => ({
  SprintSections: () => <div data-testid="sprint-sections" />,
}));

jest.mock("./sprint-planning-panel", () => ({
  SprintPlanningPanel: () => <div data-testid="sprint-planning-panel" />,
}));

jest.mock("./sprints-page-skeleton", () => ({
  SprintsPageSkeleton: () => <div data-testid="sprints-skeleton" />,
}));

jest.mock("@/features/build/shared/module-disabled-state", () => ({
  ModuleDisabledState: ({ moduleName }: { moduleName: string }) => (
    <div data-testid="module-disabled">{moduleName}</div>
  ),
}));

jest.mock("@/components/illustrations", () => ({
  EmptySprintIllustration: () => null,
}));

jest.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({ children }: { children: (provided: object) => React.ReactNode }) =>
    children({ innerRef: () => {}, droppableProps: {}, placeholder: null }),
  Draggable: ({ children }: { children: (provided: object) => React.ReactNode }) =>
    children({ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }),
}));

import {
  useSprints,
  useProject,
  useUpdateSprint,
  useUpdateTicket,
  useProjectBoardTickets,
} from "@/hooks/api/build";
import { useCan } from "@/hooks/api/access";
import { useSprintTicketMover } from "./use-sprint-ticket-mover";

const mockUseSprints = useSprints as jest.Mock;
const mockUseProject = useProject as jest.Mock;
const mockUseUpdateSprint = useUpdateSprint as jest.Mock;
const mockUseUpdateTicket = useUpdateTicket as jest.Mock;
const mockUseProjectBoardTickets = useProjectBoardTickets as jest.Mock;
const mockUseCan = useCan as jest.Mock;
const mockUseSprintTicketMover = useSprintTicketMover as jest.Mock;

function baseQueryResult(overrides = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: undefined,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
  mockUseSprints.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseProject.mockReturnValue(baseQueryResult({ data: { key: "PROJ", settings: null, statuses: [] } }));
  mockUseProjectBoardTickets.mockReturnValue(baseQueryResult({ data: [] }));
  mockUseUpdateSprint.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseUpdateTicket.mockReturnValue({ mutate: jest.fn(), isPending: false });
  mockUseSprintTicketMover.mockReturnValue({ moveTickets: jest.fn() });
});

it("renders NoPermissionState when build:sprints:view is denied instead of blank page", () => {
  mockUseCan.mockReturnValue(false);
  mockUseSprints.mockReturnValue(baseQueryResult());
  render(<ProjectSprintsPage projectId="1" />);
  expect(screen.getByTestId("no-permission")).toBeInTheDocument();
});
