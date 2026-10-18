import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Command, CommandList } from "@/components/ui/command";
import { useCalendarSearch } from "@/hooks/api/calendar-search";
import { PaletteCalendarGroup } from "./palette-calendar-group";

jest.mock("@/hooks/api/calendar-search", () => ({ useCalendarSearch: jest.fn() }));

const mockSearch = useCalendarSearch as jest.Mock;

const probe = {
  id: "event-21",
  title: "QA1015R3 probe",
  start: "2026-10-21T09:00:00.000Z",
  end: "2026-10-21T09:30:00.000Z",
  allDay: false,
  sourceKey: "calendar-events",
  occurrenceId: "event-21",
};

function renderGroup(query: string, onSelect = jest.fn()) {
  render(
    <Command>
      <CommandList>
        <PaletteCalendarGroup query={query} onSelect={onSelect} />
      </CommandList>
    </Command>,
  );
  return onSelect;
}

describe("CAL-B-026 calendar events in the command palette", () => {
  beforeEach(() => mockSearch.mockReset());

  it("searches calendar events by title and opens the chosen one in the calendar", async () => {
    mockSearch.mockReturnValue({ data: { pages: [{ events: [probe] }] } });
    const onSelect = renderGroup("QA1015R3");

    expect(mockSearch).toHaveBeenLastCalledWith(expect.objectContaining({ query: "QA1015R3" }), true);
    await userEvent.click(screen.getByText("QA1015R3 probe"));
    const href = onSelect.mock.calls[0]?.[0] as string;
    expect(href).toMatch(/^\/calendar\?/);
    expect(new URLSearchParams(href.split("?")[1]).get("event")).toBe("event-21");
  });

  it("stays idle and renders nothing below two characters", () => {
    mockSearch.mockReturnValue({ data: undefined });
    renderGroup("Q");

    expect(mockSearch).toHaveBeenLastCalledWith(expect.anything(), false);
    expect(screen.queryByText("Calendar events")).toBeNull();
  });
});
