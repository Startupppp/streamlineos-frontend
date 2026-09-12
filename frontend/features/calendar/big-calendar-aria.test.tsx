import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import type { View } from "react-big-calendar";
import { BigCalendarWrapper, type BigCalEvent } from "./big-calendar-wrapper";

const DATE = new Date("2026-09-15T10:00:00.000Z");

const EVENTS: BigCalEvent[] = [
  {
    id: "evt-1",
    title: "Standup",
    start: new Date("2026-09-15T09:00:00.000Z"),
    end: new Date("2026-09-15T09:15:00.000Z"),
  },
  {
    id: "evt-2",
    title: "Company offsite",
    start: new Date("2026-09-16T00:00:00.000Z"),
    end: new Date("2026-09-17T00:00:00.000Z"),
    allDay: true,
  },
];

function handleView(): void {}
function handleNavigate(): void {}

function renderCalendar(view: View) {
  return render(
    <BigCalendarWrapper
      events={EVENTS}
      date={DATE}
      view={view}
      onView={handleView}
      onNavigate={handleNavigate}
    />,
  );
}

const STRUCTURAL_RULES = ["aria-required-children", "aria-required-parent"];

async function structuralViolations(container: HTMLElement): Promise<string[]> {
  const results = await axe(container);
  return results.violations
    .filter((violation) => STRUCTURAL_RULES.includes(violation.id))
    .map(
      (violation) =>
        `${violation.id}: ${violation.nodes.map((node) => node.html).join(" | ")}`,
    );
}

const ALL_DAY_VIEWS: View[] = ["week", "day"];

describe("the vendor all-day row's orphan roles are normalised away", () => {
  for (const view of ALL_DAY_VIEWS) {
    it(`${view} view no longer advertises the orphan rowgroup/row`, () => {
      const { container } = renderCalendar(view);
      const allDayCell = container.querySelector(".rbc-allday-cell");
      expect(allDayCell).not.toBeNull();
      expect(allDayCell).toHaveAttribute("role", "presentation");
      expect(
        container.querySelectorAll('.rbc-allday-cell [role="row"]'),
      ).toHaveLength(0);
      expect(
        container.querySelectorAll(
          '.rbc-allday-cell .rbc-row-content[role="presentation"]',
        ),
      ).toHaveLength(1);
    });

    it(`${view} view reports no aria-required-children / aria-required-parent violation`, async () => {
      const { container } = renderCalendar(view);
      expect(await structuralViolations(container)).toEqual([]);
    });
  }
});

describe("the month grid is deliberately left alone", () => {
  it("has no all-day cell to normalise and keeps its own row role", () => {
    const { container } = renderCalendar("month");
    expect(container.querySelector(".rbc-allday-cell")).toBeNull();
    expect(
      container.querySelectorAll('.rbc-row-content[role="row"]').length,
    ).toBeGreaterThan(0);
  });

  it("reports no structural violation as shipped", async () => {
    const { container } = renderCalendar("month");
    expect(await structuralViolations(container)).toEqual([]);
  });

  it("BITE — stripping the month row role would orphan its role=cell date cells, trading one violation for another", async () => {
    const { container } = renderCalendar("month");
    for (const row of container.querySelectorAll('.rbc-row-content[role="row"]'))
      row.setAttribute("role", "presentation");
    const violations = await structuralViolations(container);
    expect(violations.join(" ")).toContain("aria-required-parent");
  });
});

describe("the agenda (list) view", () => {
  it("never emitted the orphan roles, so nothing is rewritten there", () => {
    const { container } = renderCalendar("agenda");
    expect(container.querySelectorAll('[role="presentation"]')).toHaveLength(0);
  });
});
