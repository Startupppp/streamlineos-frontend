import { render, screen } from "@testing-library/react";
import {
  ReleaseMobileCard,
  installReleasesMocks,
  releaseColumnCell,
  releaseRow,
} from "./releases-page-test-harness";

beforeEach(installReleasesMocks);

const HANDLERS = { canManage: false, onEdit: jest.fn(), onDelete: jest.fn() };

const TWO_PARAGRAPHS = "<p>Fixed the login redirect</p><p>Added CSV export</p>";
const BULLET_LIST = "<ul><li>Fixed the login redirect</li><li>Added CSV export</li></ul>";

it("separates release notes paragraphs with a space in the name cell instead of running the last word into the next", () => {
  const nameCell = releaseColumnCell("name", HANDLERS);
  render(nameCell({ ...releaseRow, description: TWO_PARAGRAPHS }));
  expect(screen.getByText("Fixed the login redirect Added CSV export")).toBeInTheDocument();
});

it("never renders two release notes paragraphs as one concatenated word in the name cell", () => {
  const nameCell = releaseColumnCell("name", HANDLERS);
  render(nameCell({ ...releaseRow, description: TWO_PARAGRAPHS }));
  expect(screen.queryByText("Fixed the login redirectAdded CSV export")).not.toBeInTheDocument();
});

it("separates bullet release notes with a space in the name cell, which is how shipped notes are usually authored", () => {
  const nameCell = releaseColumnCell("name", HANDLERS);
  render(nameCell({ ...releaseRow, description: BULLET_LIST }));
  expect(screen.getByText("Fixed the login redirect Added CSV export")).toBeInTheDocument();
});

it("leaves a single paragraph of release notes with no leading or trailing padding in the name cell", () => {
  const nameCell = releaseColumnCell("name", HANDLERS);
  render(nameCell({ ...releaseRow, description: "<p>Bug fixes and performance</p>" }));
  expect(screen.getByText("Bug fixes and performance")).toBeInTheDocument();
});

it("separates release notes paragraphs with a space in the mobile card notes row", () => {
  render(
    <ReleaseMobileCard
      release={{ ...releaseRow, description: TWO_PARAGRAPHS, createdBy: null }}
      canManage={false}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
  expect(screen.getByText("Fixed the login redirect Added CSV export")).toBeInTheDocument();
});

it("never renders two release notes paragraphs as one concatenated word in the mobile card notes row", () => {
  render(
    <ReleaseMobileCard
      release={{ ...releaseRow, description: TWO_PARAGRAPHS, createdBy: null }}
      canManage={false}
      onEdit={jest.fn()}
      onDelete={jest.fn()}
    />,
  );
  expect(screen.queryByText("Fixed the login redirectAdded CSV export")).not.toBeInTheDocument();
});
