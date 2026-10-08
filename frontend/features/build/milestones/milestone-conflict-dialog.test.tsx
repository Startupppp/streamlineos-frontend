import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MilestoneUpsertSheet } from "./milestone-upsert-sheet";
import { ApiError } from "@/lib/api-envelope";
import type { ProjectMilestone } from "@/hooks/api/build/milestones";

const updateMutate = jest.fn();

jest.mock("@/hooks/api/build/milestones", () => ({
  useCreateMilestone: () => ({ mutate: jest.fn(), isPending: false }),
  useUpdateMilestone: () => ({ mutate: updateMutate, isPending: false }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: () => ({
    data: { data: [{ membershipId: 4, userId: "user-4", name: "Dana Scully", email: "dana@example.com", image: null }] },
  }),
}));

jest.mock("@/hooks/api/build/build-members", () => ({
  useBuildMembers: () => ({
    data: {
      data: [{
        id: "user-4",
        role: "member",
        addedAt: "2026-01-01T00:00:00.000Z",
        name: "Dana Scully",
        firstName: "Dana",
        lastName: "Scully",
        email: "dana@example.com",
        image: null,
        teams: [],
      }],
    },
  }),
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: () => null,
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

import { toast } from "sonner";

const MILESTONE: ProjectMilestone = {
  id: 3,
  projectId: 42,
  orgId: "org-1",
  name: "Beta rollout",
  description: null,
  targetDate: "2026-12-15",
  status: "PENDING",
  createdBy: "user-1",
  version: 7,
  ownerMembershipId: 4,
  owner: { membershipId: 4, firstName: "Dana", lastName: "Scully", image: null },
  linkedTicketCount: 0,
  completedTicketCount: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

const CONFLICT = new ApiError("conflict", 409, "PROJECTS_TICKET_CONFLICT", { currentVersion: 9 });

beforeEach(() => {
  updateMutate.mockClear();
  (toast.error as jest.Mock).mockClear();
  (toast.warning as jest.Mock).mockClear();
});

async function submitRenamedMilestone(): Promise<(e: unknown) => void> {
  let capturedOnError: ((e: unknown) => void) | undefined;
  updateMutate.mockImplementation((_vars: unknown, opts: { onError?: (e: unknown) => void }) => {
    capturedOnError = opts.onError;
  });
  const { container } = render(
    <MilestoneUpsertSheet projectId={42} milestone={MILESTONE} onClose={jest.fn()} />,
  );
  fireEvent.change(screen.getByDisplayValue("Beta rollout"), { target: { value: "Beta rollout v2" } });
  const form = container.ownerDocument.querySelector("form");
  if (form === null) throw new Error("the milestone upsert sheet rendered no form");
  fireEvent.submit(form);
  await screen.findByRole("button", { name: "Save Changes" });
  if (!capturedOnError) throw new Error("the sheet never submitted an update");
  return capturedOnError;
}

it("opens a field-level comparison when a milestone update comes back 409, instead of only a toast", async () => {
  const onError = await submitRenamedMilestone();
  await act(async () => onError(CONFLICT));
  await waitFor(() => {
    expect(screen.getByText("Name")).toBeInTheDocument();
  });
  expect(screen.getByText("Beta rollout")).toBeInTheDocument();
  expect(screen.getByText("Beta rollout v2")).toBeInTheDocument();
});

it("shows the server value and the pending value under their own labels so the two sides are distinguishable", async () => {
  const onError = await submitRenamedMilestone();
  await act(async () => onError(CONFLICT));
  await waitFor(() => {
    expect(screen.getByText("On the server now")).toBeInTheDocument();
  });
  expect(screen.getByText("Your edit")).toBeInTheDocument();
});

it("keeps an ordinary failure on the error toast and opens no comparison, so the 409 branch did not swallow errors", async () => {
  const onError = await submitRenamedMilestone();
  await act(async () => onError(new ApiError("boom", 500, "INTERNAL")));
  await waitFor(() => {
    expect(toast.error).toHaveBeenCalled();
  });
  expect(screen.queryByText("On the server now")).not.toBeInTheDocument();
});

it("falls back to a warning toast when a 409 arrives with nothing edited, because there is no field to compare", async () => {
  let capturedOnError: ((e: unknown) => void) | undefined;
  updateMutate.mockImplementation((_vars: unknown, opts: { onError?: (e: unknown) => void }) => {
    capturedOnError = opts.onError;
  });
  const { container } = render(
    <MilestoneUpsertSheet projectId={42} milestone={MILESTONE} onClose={jest.fn()} />,
  );
  const form = container.ownerDocument.querySelector("form");
  if (form === null) throw new Error("the milestone upsert sheet rendered no form");
  fireEvent.submit(form);
  await screen.findByRole("button", { name: "Save Changes" });
  await act(async () => capturedOnError?.(CONFLICT));
  await waitFor(() => {
    expect(toast.warning).toHaveBeenCalled();
  });
  expect(screen.queryByText("On the server now")).not.toBeInTheDocument();
});
