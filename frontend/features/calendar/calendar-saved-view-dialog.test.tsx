import type { FormEvent } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import type { CalendarSavedViewFormValues } from "./calendar-saved-view-form-schema";
import { CalendarSavedViewDialog } from "./calendar-saved-view-dialog";

const mockIsMobile = jest.fn(() => false);

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => mockIsMobile() }));
jest.mock("./calendar-saved-view-filter-fields", () => ({
  CalendarSavedViewFilterFields: () => <div data-testid="saved-view-filters">Saved view filters</div>,
}));

function SavedViewHarness({ mode, onSubmit }: {
  mode: "create" | "rename";
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const form = useForm<CalendarSavedViewFormValues>({
    defaultValues: {
      name: "Team calendar",
      scope: "personal",
      dateKind: "this-week",
      sourceKey: "all",
      ownerMembershipId: "all",
      projectId: "all",
      location: "",
      status: "",
      actionable: "all",
    },
  });

  return (
    <CalendarSavedViewDialog
      mode={mode}
      form={form}
      actorMembershipId={1}
      canManageTeam
      viewMode="calendar"
      isPending={false}
      onClose={jest.fn()}
      onSubmit={onSubmit}
    />
  );
}

afterEach(() => {
  mockIsMobile.mockReturnValue(false);
});

it("uses a desktop sheet for creating a filtered view and submits from its footer", async () => {
  const onSubmit = jest.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
  render(<SavedViewHarness mode="create" onSubmit={onSubmit} />);

  const sheet = screen.getByRole("dialog", { name: "Save calendar view" });
  expect(sheet).toHaveAttribute("data-slot", "sheet-content");
  expect(sheet).toHaveClass("data-[state=open]:slide-in-from-right");
  expect(screen.getByTestId("saved-view-filters")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Saved view date range" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Save view" }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

it("keeps renaming as a compact dialog and submits from its footer", async () => {
  const onSubmit = jest.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
  render(<SavedViewHarness mode="rename" onSubmit={onSubmit} />);

  const dialog = screen.getByRole("dialog", { name: "Rename view" });
  expect(dialog).toHaveAttribute("data-slot", "dialog-content");
  expect(screen.queryByTestId("saved-view-filters")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Rename" }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

it("opens both saved-view modes from the bottom on mobile", () => {
  mockIsMobile.mockReturnValue(true);
  const onSubmit = jest.fn();
  const view = render(<SavedViewHarness mode="create" onSubmit={onSubmit} />);
  expect(screen.getByRole("dialog", { name: "Save calendar view" })).toHaveClass("data-[state=open]:slide-in-from-bottom");
  view.rerender(<SavedViewHarness mode="rename" onSubmit={onSubmit} />);
  expect(screen.getByRole("dialog", { name: "Rename view" })).toHaveClass("data-[state=open]:slide-in-from-bottom");
});
