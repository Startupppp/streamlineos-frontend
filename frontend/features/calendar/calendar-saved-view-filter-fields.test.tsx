import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { CalendarSavedViewFilterFields } from "./calendar-saved-view-filter-fields";
import type { CalendarSavedViewFormValues } from "./calendar-saved-view-form-schema";

const fetchNextPage = jest.fn();
const useInfiniteProjects = jest.fn();
let reportVisible: (() => void) | undefined;
const originalIntersectionObserver = globalThis.IntersectionObserver;

jest.mock("@/hooks/api/calendar", () => ({ useCalendarSources: () => ({ data: [] }) }));
jest.mock("./use-calendar-connections", () => ({ useCalendarConnections: () => ({ data: [] }) }));
jest.mock("@/hooks/api/build/projects", () => ({ useInfiniteProjects: () => useInfiniteProjects() }));
jest.mock("@/hooks/api/members/use-member-directory", () => ({
  useMemberDirectory: () => ({ members: [
    { id: "alice", membershipId: 2, email: "alice@example.test", name: "Alice", firstName: "Alice", lastName: null, image: null },
    { id: "bob", membershipId: 3, email: "bob@example.test", name: "Bob", firstName: "Bob", lastName: null, image: null },
  ], selectedMembers: [] }),
}));
jest.mock("@/components/members/member-picker", () => ({
  MemberPicker: ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
    <div>
      <span data-testid="saved-owner-visible">{value}</span>
      <button type="button" onClick={() => onChange("alice")}>Pick Alice</button>
    </div>
  ),
}));
jest.mock("@/components/ui/select", () => ({
  Select: ({ children, onOpenChange }: { children: ReactNode; onOpenChange?: (open: boolean) => void }) => (
    <div><button type="button" onClick={() => onOpenChange?.(true)}>Open project picker</button>{children}</div>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));

function Fields() {
  const form = useForm<CalendarSavedViewFormValues>({
    defaultValues: {
      name: "View", scope: "personal", dateKind: "today", sourceKey: "all",
      ownerMembershipId: "all", projectId: "all", location: "", status: "", actionable: "all",
    },
  });
  return <FormProvider {...form}><CalendarSavedViewFilterFields actorMembershipId={1} /><ResetOwner /></FormProvider>;
}

function ResetOwner() {
  const form = useFormContext<CalendarSavedViewFormValues>();
  return <button type="button" onClick={() => form.reset({ ...form.getValues(), ownerMembershipId: "3" })}>Open Bob view</button>;
}

beforeEach(() => {
  jest.clearAllMocks();
  reportVisible = undefined;
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: class {
      constructor(callback: IntersectionObserverCallback) {
        reportVisible = () => Reflect.apply(callback, null, [[{ isIntersecting: true }], this]);
      }
      observe() {}
      disconnect() {}
    },
  });
  useInfiniteProjects.mockReturnValue({
    data: { pages: [{ data: [{ id: 1, name: "First project" }] }] },
    dataUpdatedAt: 1,
    hasNextPage: true,
    isFetchingNextPage: false,
    fetchNextPage,
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: originalIntersectionObserver,
  });
});

it("loads later authorized projects when the project picker reaches its footer", () => {
  const view = render(<Fields />);
  expect(screen.queryByRole("button", { name: "More projects" })).toBeNull();
  fireEvent.click(screen.getAllByRole("button", { name: "Open project picker" })[1]);
  expect(reportVisible).toBeDefined();
  act(() => { reportVisible?.(); reportVisible?.(); });
  expect(fetchNextPage).toHaveBeenCalledTimes(1);

  useInfiniteProjects.mockReturnValue({
    data: { pages: [{ data: [{ id: 1, name: "First project" }] }, { data: [{ id: 2, name: "Later project" }] }] },
    dataUpdatedAt: 2,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage,
  });
  view.rerender(<Fields />);
  expect(screen.getByText("Later project")).toBeTruthy();
});

it("shows the reset saved-view owner instead of the previous picked owner", () => {
  render(<Fields />);
  fireEvent.click(screen.getByRole("button", { name: "Pick Alice" }));
  expect(screen.getByTestId("saved-owner-visible").textContent).toBe("alice");

  fireEvent.click(screen.getByRole("button", { name: "Open Bob view" }));
  expect(screen.getByTestId("saved-owner-visible").textContent).toBe("bob");
});
