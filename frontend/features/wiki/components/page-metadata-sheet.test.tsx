import { fireEvent, render, screen } from "@testing-library/react";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import PageMetadataSheet from "./page-metadata-sheet";

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn() }));
jest.mock("@/hooks/api/kb/spaces", () => ({ useKbSpaces: jest.fn(() => ({ data: { data: [] } })) }));
jest.mock("@/hooks/api/kb/pages", () => ({
  useUpdateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  usePublishKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useArchiveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUnarchiveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useVerifyKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useMarkStaleKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));
jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ disabled, id }: { disabled?: boolean; id?: string }) => <button type="button" id={id} disabled={disabled}>Select owner</button>,
}));
jest.mock("./page-record-links", () => ({ PageRecordLinks: () => null }));
jest.mock("./reviews-decision-dialogs", () => ({ RequestReviewDialog: () => null }));

const { useCan } = jest.requireMock<{ useCan: jest.Mock }>("@/hooks/api/access");
const { usePublishKbPage } = jest.requireMock<{ usePublishKbPage: jest.Mock }>("@/hooks/api/kb/pages");

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
    contentRevision: 3,
    nextReviewAt: null,
    verifiedUntil: null,
    ...overrides,
  } as KbPageDetail;
}

function renderSheet(currentPage: KbPageDetail) {
  render(<PageMetadataSheet page={currentPage} pageId={42} open onOpenChange={jest.fn()} />);
}

beforeEach(() => {
  jest.clearAllMocks();
  useCan.mockImplementation((key: string) => key === "kb:pages:update");
});

it("shows named metadata controls and allows an editor to publish", () => {
  const mutate = jest.fn();
  usePublishKbPage.mockReturnValue({ mutate, isPending: false });
  renderSheet(page());
  expect(screen.getByRole("button", { name: "Publish" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Verify" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Space" })).not.toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Status" })).not.toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Content type" })).not.toBeDisabled();
  expect(screen.getByRole("button", { name: "Owner" })).not.toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Publish" }));
  expect(mutate).toHaveBeenCalledWith(42, expect.anything());
});

it("keeps metadata controls read-only when page edit access is denied", () => {
  renderSheet(page({ canEdit: false }));
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
