import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionItemMenu } from "./wiki-page-collection-item-menu";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  useDeleteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDuplicateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useToggleFavoriteKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useArchiveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUnarchiveKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useUpdateKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/kb/shortcuts", () => ({
  useCreateKbShortcut: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/kb/export-page", () => ({
  useExportKbPage: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("next/dynamic", () => (fn: () => Promise<{ default: React.ComponentType }>) => {
  const MockGrantsSheet = ({ open }: { open: boolean }) =>
    open ? <div data-testid="grants-sheet" /> : null;
  MockGrantsSheet.displayName = "MockPageGrantsSheet";
  return MockGrantsSheet;
});

jest.mock("@/components/ui/user-combobox", () => ({
  UserCombobox: ({ onChange }: { onChange: (v: string) => void }) => (
    <input data-testid="user-combobox" onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { useCan } from "@/hooks/api/access";
import { useArchiveKbPage, useUnarchiveKbPage, useUpdateKbPage } from "@/hooks/api/kb/pages";

const mockUseCan = useCan as jest.Mock;
const mockUseArchivePage = useArchiveKbPage as jest.Mock;
const mockUseUnarchivePage = useUnarchiveKbPage as jest.Mock;
const mockUseUpdatePage = useUpdateKbPage as jest.Mock;

function makeArchiveMutate() {
  const mutate = jest.fn();
  mockUseArchivePage.mockReturnValue({ mutate, isPending: false });
  return mutate;
}

function makeUnarchiveMutate() {
  const mutate = jest.fn();
  mockUseUnarchivePage.mockReturnValue({ mutate, isPending: false });
  return mutate;
}

function makeUpdateMutate() {
  const mutate = jest.fn();
  mockUseUpdatePage.mockReturnValue({ mutate, isPending: false });
  return mutate;
}

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    title: "Test page",
    icon: null,
    coverImage: null,
    spaceId: null,
    projectId: null,
    parentPageId: null,
    status: "published",
    visibility: "org",
    contentType: "rich-text",
    kind: "document",
    trustState: "verified",
    ownerMembershipId: 1,
    ownerUserId: "user-1",
    createdById: "user-1",
    createdByMembershipId: 1,
    lastEditedById: "user-1",
    lastEditedByMembershipId: 1,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
    deletedAt: null,
    nextReviewAt: null,
    verifiedUntil: null,
    contentRevision: 5,
    aclRevision: 1,
    isLocked: false,
    can: { edit: true, manage: true },
    sharedBy: null,
    ...overrides,
  } as Parameters<typeof CollectionItemMenu>[0]["page"];
}

beforeEach(() => {
  mockUseCan.mockReturnValue(true);
});

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Page actions" }));
  return user;
}

describe("CollectionItemMenu — the page's own capabilities gate its actions, not the org key alone", () => {
  it("hides Share and Delete on a page the actor can edit but not manage, keeping Transfer ownership which needs only edit plus the manage key", async () => {
    render(<CollectionItemMenu page={makeItem({ can: { edit: true, manage: false } })} />);
    await openMenu();
    expect(screen.queryByRole("menuitem", { name: "Share" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Delete" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Transfer ownership" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Move" })).toBeInTheDocument();
  });

  it("hides Move and Cover on a locked page for an actor who cannot manage it", async () => {
    render(<CollectionItemMenu page={makeItem({ isLocked: true, can: { edit: true, manage: false } })} />);
    await openMenu();
    expect(screen.queryByRole("menuitem", { name: "Move" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Add cover" })).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy link" })).toBeInTheDocument();
  });

  it("CONTROL: a page manager still sees Move, Share and Delete on a locked page", async () => {
    render(<CollectionItemMenu page={makeItem({ isLocked: true, can: { edit: true, manage: true } })} />);
    await openMenu();
    expect(screen.getByRole("menuitem", { name: "Move" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Share" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("hides edit actions on a page the actor can only view", async () => {
    render(<CollectionItemMenu page={makeItem({ can: { edit: false, manage: false } })} />);
    await openMenu();
    expect(screen.queryByRole("menuitem", { name: "Move" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Archive" })).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Transfer ownership" })).not.toBeInTheDocument();
  });
});

describe("CollectionItemMenu — share action gating", () => {
  it("shows the Share item when canManage is true", async () => {
    mockUseCan.mockReturnValue(true);
    render(<CollectionItemMenu page={makeItem()} />);
    await openMenu();
    expect(screen.getByRole("menuitem", { name: "Share" })).toBeInTheDocument();
  });

  it("hides the Share item when canManage is false", async () => {
    mockUseCan.mockImplementation((key: string) => key !== "kb:pages:manage");
    render(<CollectionItemMenu page={makeItem()} />);
    await openMenu();
    expect(screen.queryByRole("menuitem", { name: "Share" })).not.toBeInTheDocument();
  });

  it("opens the grants sheet when Share is selected", async () => {
    render(<CollectionItemMenu page={makeItem()} />);
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Share" }));
    expect(screen.getByTestId("grants-sheet")).toBeInTheDocument();
  });
});

describe("CollectionItemMenu — archive action gating and mutation", () => {
  it("shows Archive for a non-archived page when canUpdate is true", async () => {
    render(<CollectionItemMenu page={makeItem({ status: "published" })} />);
    await openMenu();
    expect(screen.getByRole("menuitem", { name: "Archive" })).toBeInTheDocument();
  });

  it("shows Unarchive for an archived page", async () => {
    render(<CollectionItemMenu page={makeItem({ status: "archived" })} />);
    await openMenu();
    expect(screen.getByRole("menuitem", { name: "Unarchive" })).toBeInTheDocument();
  });

  it("hides Archive when canUpdate is false", async () => {
    mockUseCan.mockImplementation((key: string) => key !== "kb:pages:update");
    render(<CollectionItemMenu page={makeItem()} />);
    await openMenu();
    expect(screen.queryByRole("menuitem", { name: "Archive" })).not.toBeInTheDocument();
  });

  it("calls archive mutation with the page id and expected content revision", async () => {
    const archiveMutate = makeArchiveMutate();
    const page = makeItem({ status: "published", contentRevision: 5 });
    render(<CollectionItemMenu page={page} />);
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Archive" }));
    expect(archiveMutate).toHaveBeenCalledWith(
      expect.objectContaining({ pageId: 7, expectedContentRevision: 5 }),
      expect.anything(),
    );
  });

  it("calls unarchive mutation with the page id and expected content revision for an archived page", async () => {
    const unarchiveMutate = makeUnarchiveMutate();
    const page = makeItem({ status: "archived", contentRevision: 3 });
    render(<CollectionItemMenu page={page} />);
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Unarchive" }));
    expect(unarchiveMutate).toHaveBeenCalledWith(
      expect.objectContaining({ pageId: 7, expectedContentRevision: 3 }),
      expect.anything(),
    );
  });
});

describe("CollectionItemMenu — transfer ownership action", () => {
  it("shows Transfer ownership when canManage is true", async () => {
    render(<CollectionItemMenu page={makeItem()} />);
    await openMenu();
    expect(screen.getByRole("menuitem", { name: "Transfer ownership" })).toBeInTheDocument();
  });

  it("hides Transfer ownership when canManage is false", async () => {
    mockUseCan.mockImplementation((key: string) => key !== "kb:pages:manage");
    render(<CollectionItemMenu page={makeItem()} />);
    await openMenu();
    expect(screen.queryByRole("menuitem", { name: "Transfer ownership" })).not.toBeInTheDocument();
  });

  it("calls updatePage with the selected owner and expected content revision", async () => {
    const updateMutate = makeUpdateMutate();
    render(<CollectionItemMenu page={makeItem({ contentRevision: 5 })} />);
    const user = await openMenu();
    await user.click(screen.getByRole("menuitem", { name: "Transfer ownership" }));
    const combobox = screen.getByTestId("user-combobox");
    await user.type(combobox, "user-new");
    await user.click(screen.getByRole("button", { name: "Transfer" }));
    expect(updateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ pageId: 7, ownerUserId: "user-new", expectedContentRevision: 5 }),
      expect.anything(),
    );
  });
});
