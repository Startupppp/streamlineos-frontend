import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Command, CommandList } from "@/components/ui/command";
import type { PalettePeopleSearch } from "../hooks/use-people-search";
import { PalettePeopleGroup } from "./palette-people-group";

const PERSON = {
  id: "emp-1",
  name: "Amitha Rao",
  subtitle: "Design Lead",
  href: "/hr/employees/emp-1",
};

function searchState(overrides: Partial<PalettePeopleSearch>): PalettePeopleSearch {
  return {
    people: [],
    canSearchPeople: true,
    isSearching: false,
    isError: false,
    ...overrides,
  };
}

function renderGroup(
  search: PalettePeopleSearch,
  onSelect: (href: string) => void = jest.fn(),
) {
  return render(
    <Command>
      <CommandList>
        <PalettePeopleGroup search={search} onSelect={onSelect} />
      </CommandList>
    </Command>,
  );
}

describe("HRMS-UX-017 — the palette People group", () => {
  it("renders nothing for an actor who may not read employees", () => {
    renderGroup(searchState({ canSearchPeople: false, people: [PERSON] }));

    expect(screen.queryByText("People")).not.toBeInTheDocument();
    expect(screen.queryByText("Amitha Rao")).not.toBeInTheDocument();
  });

  it("lists the people the server returned", () => {
    renderGroup(searchState({ people: [PERSON] }));

    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Amitha Rao")).toBeInTheDocument();
    expect(screen.getByText("Design Lead")).toBeInTheDocument();
  });

  it("navigates to the person on select", async () => {
    const onSelect = jest.fn();
    renderGroup(searchState({ people: [PERSON] }), onSelect);

    await userEvent.click(screen.getByText("Amitha Rao"));

    expect(onSelect).toHaveBeenCalledWith("/hr/employees/emp-1");
  });

  it("shows a plain unavailable row, never an integrity message or rows, when the people read fails", () => {
    renderGroup(searchState({ isError: true }));

    expect(screen.getByRole("alert")).toHaveTextContent("People search is unavailable");
    expect(screen.queryByText(/integrity|unfiltered/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Amitha Rao")).not.toBeInTheDocument();
  });

  it("renders no group and no alert when a settled search found nobody", () => {
    renderGroup(searchState({}));

    expect(screen.queryByText("People")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
