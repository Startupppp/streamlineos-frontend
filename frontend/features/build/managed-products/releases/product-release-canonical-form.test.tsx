import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import { ProductReleaseFormSheet } from "./product-release-form-sheet";
import { buildRelease } from "./product-releases-test-fixtures";

const mockCreateMutate = jest.fn();
const mockUpdateMutate = jest.fn();
const mockUseManagedProductProjects = jest.fn();
const mockUseReleases = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => "/build/managed-products/7/releases",
  useSearchParams: () => new URLSearchParams(""),
}));

jest.mock("@/hooks/api/build/managed-product-releases", () => ({
  useCreateManagedProductRelease: () => ({
    mutate: mockCreateMutate,
    isPending: false,
  }),
  useUpdateManagedProductRelease: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
    variables: undefined,
  }),
}));

jest.mock("@/hooks/api/build/managed-product-projects", () => ({
  useManagedProductProjects: (...args: unknown[]) => mockUseManagedProductProjects(...args),
}));

jest.mock("@/hooks/api/build/releases", () => ({
  useReleases: (...args: unknown[]) => mockUseReleases(...args),
}));

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useRegisterDirtyState: () => {},
}));

jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: () => null,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: () => null,
}));

const LINKED_PROJECTS = [
  { id: 10, name: "Billing Project", key: "BILL", status: "active", isPrimary: false },
];

const RELEASES_FOR_PROJECT_10 = [
  { id: 99, name: "v2.0 Sprint", version: "2.0.0", status: "released", releaseDate: "2026-09-01" },
  { id: 100, name: "v2.1 Fix", version: "2.1.0", status: "draft", releaseDate: null },
];

function setupDefaults() {
  mockUseManagedProductProjects.mockReturnValue({
    data: { data: LINKED_PROJECTS, pagination: { limit: 50, hasMore: false, nextCursor: null } },
    isLoading: false,
  });
  mockUseReleases.mockImplementation((projectId: number) => ({
    data: projectId === 10
      ? { data: RELEASES_FOR_PROJECT_10, pagination: { limit: 50, hasMore: false, nextCursor: null } }
      : undefined,
    isLoading: false,
  }));
}

function renderCreateSheet() {
  return render(
    <ProductReleaseFormSheet
      managedProductId={7}
      open
      onOpenChange={jest.fn()}
    />,
  );
}

function renderEditSheet(editTarget: ManagedProductRelease) {
  return render(
    <ProductReleaseFormSheet
      managedProductId={7}
      editTarget={editTarget}
      open
      onOpenChange={jest.fn()}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(Element.prototype, "hasPointerCapture", { value: jest.fn(() => false), writable: true, configurable: true });
  Object.defineProperty(Element.prototype, "setPointerCapture", { value: jest.fn(), writable: true, configurable: true });
  Object.defineProperty(Element.prototype, "releasePointerCapture", { value: jest.fn(), writable: true, configurable: true });
  setupDefaults();
});

describe("ProductReleaseFormSheet — canonical project release", () => {
  it("submits the chosen projectReleaseId, so the product release records which canonical delivery release ships it", async () => {
    const user = userEvent.setup();
    renderCreateSheet();

    await user.type(screen.getByPlaceholderText("Release name"), "My Release");
    await user.type(screen.getByPlaceholderText("1.0.0"), "1.0.0");

    const projectTrigger = screen.getByRole("combobox", { name: "Project for canonical release" });
    await user.click(projectTrigger);
    await user.click(await screen.findByRole("option", { name: "Billing Project" }));

    const releaseTrigger = screen.getByRole("combobox", { name: "Canonical release" });
    await user.click(releaseTrigger);
    await user.click(await screen.findByRole("option", { name: "v2.0 Sprint 2.0.0" }));

    await user.click(screen.getByRole("button", { name: "Create release" }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ projectReleaseId: 99 }),
      expect.anything(),
    );
  });

  it("submits null to clear the link, so a wrong canonical release can be detached rather than only replaced", async () => {
    const user = userEvent.setup();
    const editTarget: ManagedProductRelease = {
      ...buildRelease({ id: 1, projectReleaseId: 99, recordRevision: 2 }),
      projectRelease: {
        id: 99,
        name: "v2.0 Sprint",
        version: "2.0.0",
        projectId: 10,
        projectName: "Billing Project",
        projectKey: "BILL",
      },
    };
    renderEditSheet(editTarget);

    const clearButton = screen.getByRole("button", { name: "Clear canonical release link" });
    await user.click(clearButton);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ projectReleaseId: null }),
      expect.anything(),
    );
  });

  it("offers releases only from projects linked to this product, because the backend 404s any other project release", async () => {
    const user = userEvent.setup();
    renderCreateSheet();

    const projectTrigger = screen.getByRole("combobox", { name: "Project for canonical release" });
    await user.click(projectTrigger);

    const projectOptions = await screen.findAllByRole("option");
    const projectLabels = projectOptions.map((o) => o.textContent);
    expect(projectLabels).toContain("Billing Project");
    expect(projectLabels).not.toContain("Unlinked External Project");

    await user.click(screen.getByRole("option", { name: "Billing Project" }));

    const releaseTrigger = screen.getByRole("combobox", { name: "Canonical release" });
    await user.click(releaseTrigger);

    const releaseOptions = await screen.findAllByRole("option");
    const releaseLabels = releaseOptions.map((o) => o.textContent);
    expect(releaseLabels).toContain("v2.0 Sprint 2.0.0");
    expect(releaseLabels).toContain("v2.1 Fix 2.1.0");

    expect(mockUseReleases).toHaveBeenCalledWith(10);
  });

  it("editing a release that already has a canonical link shows the linked project and release by name", async () => {
    const editTarget: ManagedProductRelease = {
      ...buildRelease({ id: 1, projectReleaseId: 99, recordRevision: 1 }),
      projectRelease: {
        id: 99,
        name: "v2.0 Sprint",
        version: "2.0.0",
        projectId: 10,
        projectName: "Billing Project",
        projectKey: "BILL",
      },
    };
    renderEditSheet(editTarget);

    const projectTrigger = screen.getByRole("combobox", { name: "Project for canonical release" });
    expect(projectTrigger).toHaveTextContent("Billing Project");

    const releaseTrigger = screen.getByRole("combobox", { name: "Canonical release" });
    expect(releaseTrigger).toHaveTextContent("v2.0 Sprint 2.0.0");
  });
});
