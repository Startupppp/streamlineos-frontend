import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api-envelope";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import PageMetadataSheet from "./page-metadata-sheet";
import { toast } from "sonner";

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/hooks/api/kb/spaces", () => ({ useKbSpaces: jest.fn(() => ({ data: { data: [] } })) }));
jest.mock("@/hooks/api/kb/pages", () => ({
  useKbPage: jest.fn(() => ({ refetch: jest.fn() })),
  useUpdateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  usePublishKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useArchiveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUnarchiveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useVerifyKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useMarkStaleKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));
jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ disabled, id, onChange }: { disabled?: boolean; id?: string; onChange: (value: string) => void }) => <button type="button" id={id} disabled={disabled} onClick={() => onChange("user-2")}>Select owner</button>,
}));
jest.mock("./page-record-links", () => ({ PageRecordLinks: () => null }));
jest.mock("./reviews-decision-dialogs", () => ({ RequestReviewDialog: () => null }));

const { useCan } = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access");
const { usePublishKbPage, useArchiveKbPage, useUnarchiveKbPage } = jest.requireMock<{ usePublishKbPage: jest.Mock; useArchiveKbPage: jest.Mock; useUnarchiveKbPage: jest.Mock }>("@/hooks/api/kb/pages");
const { useUpdateKbPage, useKbPage } = jest.requireMock<{ useUpdateKbPage: jest.Mock; useKbPage: jest.Mock }>("@/hooks/api/kb/pages");
const { useKbSpaces } = jest.requireMock<{ useKbSpaces: jest.Mock }>("@/hooks/api/kb/spaces");

function page(overrides: Partial<KbPageDetail> = {}): KbPageDetail {
  return {
    id: 42,
    title: "Runbook",
    spaceId: null,
    status: "draft",
    contentType: "runbook",
    trustState: "unverified",
    ownerUserId: null,
    isLocked: false,
    canEdit: true,
    can: { view: true, comment: true, edit: true, manage: false, restore: false },
    access: { via: "organization", grantExpiresAt: null },
    contentRevision: 3,
    nextReviewAt: null,
    verifiedUntil: null,
    ...overrides,
  } as KbPageDetail;
}

function renderSheet(currentPage: KbPageDetail) {
  return render(<PageMetadataSheet page={currentPage} pageId={42} open onOpenChange={jest.fn()} />);
}

let canManage = false;

beforeEach(() => {
  jest.clearAllMocks();
  canManage = false;
  useCan.mockImplementation((key: string) => key === "kb:pages:update" || (key === "kb:pages:manage" && canManage));
  useUpdateKbPage.mockReturnValue({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false });
  useKbPage.mockReturnValue({ refetch: jest.fn() });
  useKbSpaces.mockReturnValue({ data: { data: [] } });
});

it("sends the current content revision when assigning a page owner", async () => {
  canManage = true;
  const mutate = jest.fn();
  useUpdateKbPage.mockReturnValue({ mutate, mutateAsync: jest.fn(), isPending: false });
  renderSheet(page({ contentRevision: 7 }));

  await userEvent.setup().click(screen.getByRole("button", { name: "Owner" }));

  expect(mutate).toHaveBeenCalledWith(
    { pageId: 42, ownerUserId: "user-2", expectedContentRevision: 7 },
    expect.any(Object),
  );
});

it("sends the current content revision when moving a page into a space", async () => {
  const mutate = jest.fn();
  useKbSpaces.mockReturnValue({ data: { data: [{ id: 5, name: "Team space", icon: null }] } });
  useUpdateKbPage.mockReturnValue({ mutate, mutateAsync: jest.fn(), isPending: false });
  renderSheet(page({ contentRevision: 7 }));

  fireEvent.keyDown(screen.getByRole("combobox", { name: "Team folder" }), { key: "ArrowDown" });
  fireEvent.click(screen.getByRole("option", { name: "Team space" }));

  expect(mutate).toHaveBeenCalledWith(
    { pageId: 42, spaceId: 5, expectedContentRevision: 7 },
    expect.any(Object),
  );
});

it("retains a stale owner choice and retries only after a fresh page read", async () => {
  canManage = true;
  const mutate = jest.fn((_payload, options) => options.onError(new ApiError("Stale", 409, "STALE_REVISION", {
    currentContentRevision: 8,
    lastEditedByName: null,
    lastEditedAt: null,
  })));
  const mutateAsync = jest.fn().mockResolvedValue({ contentRevision: 9 });
  const refetch = jest.fn()
    .mockResolvedValueOnce({ isSuccess: true, data: page({ contentRevision: 7 }) })
    .mockResolvedValueOnce({ isSuccess: true, data: page({ contentRevision: 8 }) });
  useUpdateKbPage.mockReturnValue({ mutate, mutateAsync, isPending: false });
  useKbPage.mockReturnValue({ refetch });
  renderSheet(page({ contentRevision: 7 }));
  const user = userEvent.setup();

  await user.click(screen.getByRole("button", { name: "Owner" }));
  expect(screen.getByRole("button", { name: "Retry owner change" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Retry owner change" }));
  expect(mutateAsync).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Retry owner change" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Retry owner change" }));

  await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({
    pageId: 42,
    ownerUserId: "user-2",
    expectedContentRevision: 8,
  }));
  expect(screen.queryByRole("button", { name: "Retry owner change" })).toBeNull();
});

it("keeps Owner unavailable to an editor without page manage permission while Space remains editable", async () => {
  const mutate = jest.fn();
  useUpdateKbPage.mockReturnValue({ mutate, mutateAsync: jest.fn(), isPending: false });
  renderSheet(page());

  expect(screen.getByRole("button", { name: "Owner" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Team folder" })).toBeEnabled();
  await userEvent.setup().click(screen.getByRole("button", { name: "Owner" }));
  expect(mutate).not.toHaveBeenCalled();
});

it("disables a pending Owner retry when manage permission is revoked", async () => {
  canManage = true;
  const mutate = jest.fn((_payload, options) => options.onError(new ApiError("Stale", 409, "STALE_REVISION")));
  const mutateAsync = jest.fn();
  useUpdateKbPage.mockReturnValue({ mutate, mutateAsync, isPending: false });
  const currentPage = page();
  const view = renderSheet(currentPage);
  await userEvent.setup().click(screen.getByRole("button", { name: "Owner" }));
  expect(screen.getByRole("button", { name: "Retry owner change" })).toBeEnabled();

  canManage = false;
  view.rerender(<PageMetadataSheet page={currentPage} pageId={42} open onOpenChange={jest.fn()} />);

  expect(screen.getByRole("button", { name: "Owner" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Retry owner change" })).toBeDisabled();
  expect(mutateAsync).not.toHaveBeenCalled();
});

it("shows named metadata controls and allows an editor to publish", () => {
  canManage = true;
  const mutate = jest.fn();
  usePublishKbPage.mockReturnValue({ mutate, isPending: false });
  renderSheet(page());
  expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Team folder" })).not.toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Status" })).not.toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Content type" })).not.toBeDisabled();
  expect(screen.getByRole("button", { name: "Owner" })).not.toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(mutate).toHaveBeenCalledWith({ pageId: 42, expectedContentRevision: 3 }, expect.anything());
});

it("sends the current revision when archiving and unarchiving", () => {
  const archive = jest.fn();
  const unarchive = jest.fn();
  useArchiveKbPage.mockReturnValue({ mutate: archive, isPending: false });
  useUnarchiveKbPage.mockReturnValue({ mutate: unarchive, isPending: false });
  const view = renderSheet(page({ status: "published", contentRevision: 8 }));
  fireEvent.click(screen.getByRole("button", { name: "Archive" }));
  expect(archive).toHaveBeenCalledWith({ pageId: 42, expectedContentRevision: 8 }, expect.anything());
  view.rerender(<PageMetadataSheet page={page({ status: "archived", contentRevision: 9 })} pageId={42} open onOpenChange={jest.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Unarchive" }));
  expect(unarchive).toHaveBeenCalledWith({ pageId: 42, expectedContentRevision: 9 }, expect.anything());
});

it("reports stale publish conflicts without retrying against newer content", () => {
  const mutate = jest.fn();
  usePublishKbPage.mockReturnValue({ mutate, isPending: false });
  renderSheet(page());
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  mutate.mock.calls[0]?.[1].onError(new ApiError("Stale", 409, "STALE_REVISION"));
  expect(toast.error).toHaveBeenCalledWith("Page changed before publication. Refresh before trying again.");
  expect(mutate).toHaveBeenCalledTimes(1);
});

it("keeps metadata controls read-only when page edit access is denied", () => {
  renderSheet(page({ can: { view: true, comment: true, edit: false, manage: false, restore: false } }));
  expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("combobox").every((control) => control.hasAttribute("disabled"))).toBe(true);
  expect(screen.getByRole("button", { name: "Owner" })).toBeDisabled();
});

it("keeps metadata controls read-only while a non-manager sees a locked page", () => {
  renderSheet(page({ isLocked: true }));
  expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Archive" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("combobox").every((control) => control.hasAttribute("disabled"))).toBe(true);
});

it("keeps metadata controls read-only before global update permission resolves", () => {
  useCan.mockReturnValue(false);
  renderSheet(page());
  expect(screen.queryByRole("button", { name: "Publish" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("combobox").every((control) => control.hasAttribute("disabled"))).toBe(true);
});
