import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmployeeCard } from "./employee-card";
import type { EmployeeListItem } from "@/types/hr";

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

const employees: EmployeeListItem[] = Array.from(
  { length: LOADED_EMPLOYEES },
  (_, i) =>
    ({
      id: `emp-${i}`,
      firstName: "Ada",
      lastName: `Lovelace ${i}`,
      isActive: true,
    }) as unknown as EmployeeListItem,
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
