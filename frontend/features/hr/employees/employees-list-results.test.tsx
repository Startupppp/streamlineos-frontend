import { fireEvent, render, screen } from "@testing-library/react";
import { EmployeesListResults } from "./employees-list-results";

function renderEmpty(searchTerm: string, onClearFilters = jest.fn()) {
  render(
    <EmployeesListResults
      employees={[]}
      gridEmployees={[]}
      view="list"
      isFetching={false}
      hasFilters
      searchTerm={searchTerm}
      canOnboard
      onClearFilters={onClearFilters}
      onOpenPerson={jest.fn()}
    />,
  );
  return onClearFilters;
}

describe("employee list no-match state (HR-U-008)", () => {
  it("names the search that matched nobody and offers to clear it", () => {
    const onClearFilters = renderEmpty("zzzznomatch");

    expect(screen.getByText(/No employees match "zzzznomatch"/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("speaks about filters, not a search, when no search term is set", () => {
    renderEmpty("");

    expect(screen.getByText("No people match these filters.")).toBeInTheDocument();
    expect(screen.queryByText(/No employees match "/)).not.toBeInTheDocument();
  });
});
