import { render, screen, fireEvent } from "@testing-library/react";
import {
  ACCESS_DENIED,
  ReleaseMobileCard,
  baseQueryResult,
  buildReleasesColumns,
  cursorPage,
  installReleasesMocks,
  mockPreventDefault,
  mockUseAccess,
  mockUseCan,
  mockUseReleases,
  OWNER,
  OWNER_USER_ID,
  releaseColumnCell,
  releaseRow,
  releaseState,
} from "./releases-page-test-harness";
import { ReleasesPage } from "./releases-page";

beforeEach(installReleasesMocks);

it("renders the plain-text notes below the version in the name column cell", () => {
  const nameCell = releaseColumnCell("name", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(nameCell({ ...releaseRow, description: "<p>Bug fixes and performance</p>" }));
  expect(screen.getByText("Bug fixes and performance")).toBeInTheDocument();
});

it("omits the notes text from the name cell when description is null so the cell stays compact", () => {
  const nameCell = releaseColumnCell("name", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(nameCell({ ...releaseRow, description: null }));
  expect(screen.queryByText("Bug fixes and performance")).not.toBeInTheDocument();
});

it("renders the owner display name in the createdBy column cell and never the raw user id (FE-85)", () => {
  const createdByCell = releaseColumnCell("createdBy", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(createdByCell({ ...releaseRow, createdBy: OWNER_USER_ID, createdByUser: OWNER }));
  expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  expect(screen.queryByText(OWNER_USER_ID)).not.toBeInTheDocument();
});

it("renders the email local part in the createdBy cell for an owner with no name, still never the raw user id", () => {
  const createdByCell = releaseColumnCell("createdBy", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(
    createdByCell({
      ...releaseRow,
      createdBy: OWNER_USER_ID,
      createdByUser: { name: null, firstName: null, lastName: null, email: "ada@example.test" },
    }),
  );
  expect(screen.getByText("ada")).toBeInTheDocument();
  expect(screen.queryByText(OWNER_USER_ID)).not.toBeInTheDocument();
});

it("renders a dash in the createdBy cell when createdByUser is null, so an unresolvable owner is an absent value and not a blank loading cell", () => {
  const createdByCell = releaseColumnCell("createdBy", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(createdByCell({ ...releaseRow, createdBy: null, createdByUser: null }));
  expect(screen.getByText("—")).toBeInTheDocument();
});

it("renders a dash and not the id when createdBy still holds an id whose user row is gone", () => {
  const createdByCell = releaseColumnCell("createdBy", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(createdByCell({ ...releaseRow, createdBy: OWNER_USER_ID, createdByUser: null }));
  expect(screen.getByText("—")).toBeInTheDocument();
  expect(screen.queryByText(OWNER_USER_ID)).not.toBeInTheDocument();
});

it("renders the release description as notes text in the mobile card", () => {
  render(
    <ReleaseMobileCard
      release={{ ...releaseRow, description: "<p>Bug fixes and performance improvements</p>", createdBy: null }}
      canManage={false}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
  expect(screen.getByText("Bug fixes and performance improvements")).toBeInTheDocument();
});

it("renders the owner display name in the mobile card and never the raw user id (FE-85)", () => {
  render(
    <ReleaseMobileCard
      release={{ ...releaseRow, description: null, createdBy: OWNER_USER_ID, createdByUser: OWNER }}
      canManage={false}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
  expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  expect(screen.queryByText(OWNER_USER_ID)).not.toBeInTheDocument();
});

it("omits the created-by row from the mobile card when createdByUser is null, rather than falling back to the id", () => {
  render(
    <ReleaseMobileCard
      release={{ ...releaseRow, description: null, createdBy: OWNER_USER_ID, createdByUser: null }}
      canManage={false}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
  expect(screen.queryByText("Created by")).not.toBeInTheDocument();
  expect(screen.queryByText(OWNER_USER_ID)).not.toBeInTheDocument();
});

it("renders a dash in the published column for a draft release that has never been released", () => {
  const publishedCell = releaseColumnCell("publishedAt", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(publishedCell({ ...releaseRow, status: "draft", publishedAt: null }));
  expect(screen.getByText("—")).toBeInTheDocument();
});

it("renders a formatted date in the published column for a released row that has a known publication date", () => {
  const publishedCell = releaseColumnCell("publishedAt", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(publishedCell({ ...releaseRow, status: "released", publishedAt: "2026-09-01T10:00:00Z" }));
  expect(screen.getByText("Sep 1, 2026")).toBeInTheDocument();
});

it("renders Unknown in the published column for a released row with null publishedAt because the release predates the migration", () => {
  const publishedCell = releaseColumnCell("publishedAt", { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() });
  render(publishedCell({ ...releaseRow, status: "released", publishedAt: null }));
  expect(screen.getByText("Unknown")).toBeInTheDocument();
});
