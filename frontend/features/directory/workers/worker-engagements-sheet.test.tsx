import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCan } from "@/hooks/api/access";
import {
  useCancelEngagement,
  useCreateEngagement,
  useTerminateEngagement,
  useUpdateEngagement,
  useWorkerEngagements,
} from "@/hooks/api/directory/workers";
import type {
  Worker,
  WorkerEngagement,
} from "@/types/directory/workers";
import { WorkerEngagementsSheet } from "./worker-engagements-sheet";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(),
}));

jest.mock("@/hooks/api/directory/workers", () => ({
  useWorkerEngagements: jest.fn(),
  useCreateEngagement: jest.fn(),
  useUpdateEngagement: jest.fn(),
  useCancelEngagement: jest.fn(),
  useTerminateEngagement: jest.fn(),
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <input
      aria-label={placeholder}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

const worker: Worker = {
  workerId: "worker-1",
  organizationId: "org-1",
  organizationPersonId: "person-1",
  workerNumber: "EMP001",
  status: "ACTIVE",
  isPayee: false,
  deletedAt: null,
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
  firstName: "Aditya",
  lastName: "Challa",
  displayName: null,
  workEmail: "aditya@example.com",
  avatarUrl: null,
  userId: "user-1",
};

const plannedEngagement: WorkerEngagement = {
  workerEngagementId: "engagement-1",
  organizationId: "org-1",
  workerId: "worker-1",
  startsOn: "2026-08-17",
  endsOn: null,
  workerType: "FULL_TIME",
  status: "PLANNED",
  isPrimary: false,
  departmentId: null,
  businessUnitId: null,
  branchId: null,
  locationId: null,
  teamId: null,
  managerEngagementId: null,
  designation: null,
  jobRoleId: null,
  jobLevelId: null,
  employmentTypeId: null,
  probationEndsOn: null,
  noticePeriodDays: null,
  terminationReason: null,
  terminationNotes: null,
  stateReason: null,
  lastStateEventId: null,
  rowVersion: 1,
  createdByMembershipId: null,
  updatedByMembershipId: null,
  archivedAt: null,
  archivedByMembershipId: null,
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z",
};

describe("WorkerEngagementsSheet", () => {
  const createMutate = jest.fn();
  const updateMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useCan as jest.Mock).mockReturnValue(true);
    (useWorkerEngagements as jest.Mock).mockReturnValue({
      data: [plannedEngagement],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    });
    (useCreateEngagement as jest.Mock).mockReturnValue({
      mutate: createMutate,
      isPending: false,
    });
    (useUpdateEngagement as jest.Mock).mockReturnValue({
      mutate: updateMutate,
      isPending: false,
    });
    (useCancelEngagement as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
    (useTerminateEngagement as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
  });

  it("explains an overlap before sending an invalid request", async () => {
    render(
      <WorkerEngagementsSheet
        open
        onOpenChange={jest.fn()}
        worker={worker}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "+ Add engagement" }));
    fireEvent.change(screen.getByLabelText("Pick a date"), {
      target: { value: "2026-08-19" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add engagement" }));

    await waitFor(() =>
      expect(
        screen.getByText(/These dates overlap the planned engagement/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText(/Cancel that plan above/i)).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("offers the shared confirmation flow for an accidental plan", () => {
    render(
      <WorkerEngagementsSheet
        open
        onOpenChange={jest.fn()}
        worker={worker}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel plan" }));

    expect(
      screen.getByText("Cancel this planned engagement?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/The record stays in history and can still be audited/i),
    ).toBeInTheDocument();
  });

  it("edits a planned engagement without treating it as its own overlap", async () => {
    render(
      <WorkerEngagementsSheet
        open
        onOpenChange={jest.fn()}
        worker={worker}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByText("Edit planned engagement")).toBeInTheDocument();
    expect(screen.getByLabelText("Pick a date")).toHaveValue("2026-08-17");
    expect(
      screen.queryByText("Mark as primary engagement"),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Pick a date"), {
      target: { value: "2026-08-19" },
    });
    fireEvent.change(screen.getByLabelText("Open-ended"), {
      target: { value: "2026-09-30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateMutate).toHaveBeenCalledTimes(1));
    expect(updateMutate).toHaveBeenCalledWith(
      {
        workerId: "worker-1",
        workerEngagementId: "engagement-1",
        expectedVersion: 1,
        startsOn: "2026-08-19",
        endsOn: "2026-09-30",
        workerType: "FULL_TIME",
        designation: null,
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });
});
