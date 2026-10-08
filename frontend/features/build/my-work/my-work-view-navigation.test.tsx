import { fireEvent, render, screen } from "@testing-library/react";
import { MyWorkViewBody } from "./my-work-view-body";
import { DEFAULT_DISPLAY_OPTIONS } from "../views/display-options-model";
import type { AllWorkTicketMeta } from "./map-all-work-ticket";

const mockNavigate = jest.fn();
const meta: AllWorkTicketMeta = { id: 35, projectId: 1, projectKey: "STRE", ticketNumber: 35 };
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("view=list") }));
jest.mock("@/hooks/common/use-guarded-document-navigation", () => ({ useGuardedDocumentNavigation: () => mockNavigate }));
jest.mock("@/features/build/views/list-view", () => ({ ListView: ({ onTicketClick }: { onTicketClick: (id: number) => void }) => {
  function handleOpen() { onTicketClick(35); }
  return <button type="button" onClick={handleOpen}>Open list ticket</button>;
} }));
jest.mock("@/features/build/views/table-view", () => ({ TableView: ({ onTicketClick }: { onTicketClick: (id: number) => void }) => {
  function handleOpen() { onTicketClick(35); }
  return <button type="button" onClick={handleOpen}>Open table ticket</button>;
} }));
jest.mock("./my-work-board", () => ({ MyWorkBoard: ({ onTicketSelect }: { onTicketSelect: (ticket: AllWorkTicketMeta) => void }) => {
  function handleOpen() { onTicketSelect({ id: 35, projectId: 1, projectKey: "STRE", ticketNumber: 35 }); }
  return <button type="button" onClick={handleOpen}>Open board ticket</button>;
} }));

describe("My Work ticket navigation", () => {
  beforeEach(() => mockNavigate.mockClear());
  it.each(["list", "table", "board"] as const)("routes %s activation through guarded document navigation with returnTo", (view) => {
    render(<MyWorkViewBody view={view} tickets={[]} ticketMeta={new Map([[35, meta]])} displayOptions={DEFAULT_DISPLAY_OPTIONS} boardFilters={{ scope: "mine" }} />);
    fireEvent.click(screen.getByRole("button", { name: `Open ${view} ticket` }));
    expect(mockNavigate).toHaveBeenCalledWith("/build/1/tickets/STRE-35?returnTo=%2Fbuild%2Fmy-work%3Fview%3Dlist");
  });
});
