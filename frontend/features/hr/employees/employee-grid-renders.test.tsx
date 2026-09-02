/**
 * Named journey: HR employees list, grid view, three server pages loaded
 * (60 employees), one keystroke in the search box.
 *
 * `useInfiniteHrEmployees` accumulates its pages, so the grid mounts one
 * `EmployeeCard` per loaded employee and the page re-renders on every keystroke
 * (search state), every filter change and every background refetch. The card's
 * props are already stable — `employees` is a `useMemo` over the query pages, so
 * each `Employee` keeps its identity, and `department` is a plain string.
 *
 * These count card body renders across that journey. The bound on how many are
 * mounted at all is asserted separately in `employees-grid-bound.test.tsx`.
 */
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmployeeCard } from "./employee-card";
import type { Employee } from "@/types/hr";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const LOADED_EMPLOYEES = 60;
const KEYSTROKES = 5;

let cardRenders = 0;

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => {
    cardRenders += 1;
    return <div>{children}</div>;
  },
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  AvatarImage: () => null,
}));

const employees: Employee[] = Array.from(
  { length: LOADED_EMPLOYEES },
  (_, i) =>
    ({
      id: `emp-${i}`,
      firstName: "Ada",
      lastName: `Lovelace ${i}`,
      isActive: true,
    }) as unknown as Employee,
);

function Grid() {
  const [search, setSearch] = useState("");
  return (
    <TooltipProvider>
      <input
        aria-label="Search employees"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {employees.map((emp) => (
        <EmployeeCard key={emp.id} employee={emp} department="Engineering" />
      ))}
    </TooltipProvider>
  );
}

describe("HR employees grid — keystrokes must not re-render every loaded card", () => {
  beforeEach(() => {
    cardRenders = 0;
  });

  it("mounts each loaded card exactly once", () => {
    render(<Grid />);
    expect(cardRenders).toBe(LOADED_EMPLOYEES);
  });

  it("adds no card renders when the search box takes a keystroke", () => {
    render(<Grid />);
    const mountRenders = cardRenders;
    const input = screen.getByLabelText("Search employees");

    for (let i = 0; i < KEYSTROKES; i += 1)
      fireEvent.change(input, { target: { value: "a".repeat(i + 1) } });

    expect(screen.getByLabelText("Search employees")).toHaveValue(
      "a".repeat(KEYSTROKES),
    );
    expect(cardRenders - mountRenders).toBe(0);
  });
});
