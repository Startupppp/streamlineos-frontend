import { render, screen, fireEvent } from "@testing-library/react";
import { MilestoneUpsertSheet } from "./milestone-upsert-sheet";
import { milestoneUpdateRequestContract } from "@/hooks/api/build/workspace-schema";
import type { ProjectMilestone } from "@/hooks/api/build/milestones";

const updateMutate = jest.fn();
const createMutate = jest.fn();

jest.mock("@/hooks/api/build/milestones", () => ({
  useCreateMilestone: () => ({ mutate: createMutate, isPending: false }),
  useUpdateMilestone: () => ({ mutate: updateMutate, isPending: false }),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: () => ({ data: undefined }),
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: () => null,
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: jest.fn(),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

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
  ownerMembershipId: null,
  owner: null,
  linkedTicketCount: 0,
  completedTicketCount: 0,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
};

beforeEach(() => {
  updateMutate.mockClear();
  createMutate.mockClear();
});

async function submitEdit() {
  const { container } = render(
    <MilestoneUpsertSheet projectId={42} milestone={MILESTONE} onClose={jest.fn()} />,
  );
  const form = container.ownerDocument.querySelector("form");
  if (form === null) throw new Error("the milestone upsert sheet rendered no form");
  fireEvent.submit(form);
  await screen.findByRole("button", { name: "Save Changes" });
}

function sentBody(): Record<string, unknown> {
  const sent = updateMutate.mock.calls[0][0] as Record<string, unknown>;
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sent)) {
    if (key !== "milestoneId" && value !== undefined) body[key] = value;
  }
  return body;
}

it("threads the edited row's version token into the milestone update payload", async () => {
  await submitEdit();
  expect(updateMutate).toHaveBeenCalled();
  expect(sentBody().version).toBe(7);
});

it("sends a milestone edit body the backend update schema accepts", async () => {
  await submitEdit();
  expect(milestoneUpdateRequestContract.safeParse(sentBody()).success).toBe(true);
});

it("would be rejected by the backend update schema if the sheet dropped the token", async () => {
  await submitEdit();
  const withoutToken: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sentBody())) {
    if (key !== "version") withoutToken[key] = value;
  }
  expect(milestoneUpdateRequestContract.safeParse(withoutToken).success).toBe(false);
});
