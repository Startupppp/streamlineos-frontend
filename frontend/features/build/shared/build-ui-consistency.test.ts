import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSource(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Build UI consistency contracts", () => {
  it("keeps timeline period selectors readable at every breakpoint", () => {
    const source = readSource("features/build/views/gantt-view.tsx");

    expect(source).toContain('className="w-40 shrink-0"');
    expect(source).toContain('className="w-28 shrink-0"');
  });

  it("uses the standard navigation type scale in project settings", () => {
    const source = readSource(
      "features/build/settings/project-settings-page.tsx",
    );

    expect(source).toContain("text-sm font-medium");
    expect(source).toContain("font-semibold");
  });

  it("keeps My Work search and filters visible while stacking dense controls", () => {
    const source = readSource("features/build/my-work/my-work-page.tsx");

    expect(source).toContain('collapseBelow="xl"');
    expect(source).toContain("search={");
  });

  it("puts board search before the dense view controls on compact screens", () => {
    const source = readSource(
      "features/build/views/project-views-toolbar.tsx",
    );

    expect(source).toContain("mobileSearchFirst");
  });

  it("uses the full available width for shared panels and data tables", () => {
    const chromeSource = readSource("components/pm-chrome/pm-chrome.tsx");
    const dataTableSource = readSource("components/ui/data-table.tsx");

    expect(chromeSource).toContain("w-full min-w-0");
    expect(dataTableSource).toContain("w-full");
  });

  it("uses distinct semantic surfaces for hierarchy", () => {
    const globalsSource = readSource("globals.css");
    const themesSource = readSource("themes.css");
    const tabsSource = readSource("components/ui/tabs.tsx");
    const viewToggleSource = readSource("components/ui/view-toggle.tsx");
    const headerSource = readSource("components/ui/data-table-header.tsx");

    expect(globalsSource).not.toContain("--surface-raised:");
    expect(globalsSource).toContain(
      "--secondary: color-mix(in srgb, var(--foreground) 6%, var(--muted))",
    );
    expect(globalsSource).toContain(
      "--accent: color-mix(in srgb, var(--primary) 10%, var(--muted))",
    );
    expect(globalsSource).toContain("--border: #cbd5e1");
    expect(globalsSource).toContain("--input: #cbd5e1");
    expect(themesSource).toContain(
      "--border: color-mix(in srgb, var(--brand-core) 14%, #cbd5e1)",
    );
    expect(tabsSource).toContain("border border-input bg-card");
    expect(tabsSource).toContain(
      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
    );
    expect(viewToggleSource).toContain("bg-primary text-primary-foreground");
    expect(headerSource).toContain("border-b-2 border-border bg-muted");
  });

  it("keeps the client portal guidance compact instead of page-wide", () => {
    const source = readSource(
      "features/build/client-portal/client-visibility-page.tsx",
    );

    expect(source).toContain("w-fit max-w-full");
    expect(source).toContain("Visibility rules");
  });

  it("gives full-page empty states enough height and visual weight on mobile", () => {
    const source = readSource("components/ui/empty-state.tsx");

    expect(source).toContain('md: "mb-5 size-48 sm:size-56"');
    expect(source).toContain("min-h-80");
    expect(source).toContain("bg-card");
  });

  it("keeps board columns and cards visually distinct", () => {
    const columnSource = readSource(
      "features/build/views/kanban-board-column.tsx",
    );
    const cardSource = readSource(
      "features/build/views/kanban-ticket-card.tsx",
    );

    expect(columnSource).toContain("bg-muted");
    expect(cardSource).toContain("bg-card");
  });

  it("keeps timeline labels readable on compact screens", () => {
    const source = readSource("features/build/views/gantt-view.tsx");

    expect(source).toContain("? 144 :");
    expect(source).toContain("labelFontSize={11}");
  });

  it("uses a primary hover affordance for every shared field control", () => {
    const fieldControlSource = readSource("components/ui/field-control.ts");
    const inputSource = readSource("components/ui/input.tsx");
    const selectSource = readSource("components/ui/select.tsx");
    const textareaSource = readSource("components/ui/textarea.tsx");

    expect(fieldControlSource).toContain(
      '"hover:border-primary/50 hover:bg-primary/5"',
    );
    expect(fieldControlSource).toContain(
      "transition-[color,background-color,box-shadow,border-color]",
    );
    expect(inputSource).toContain("FIELD_CONTROL_HOVER_CLASS");
    expect(selectSource).toContain("FIELD_CONTROL_HOVER_CLASS");
    expect(textareaSource).toContain("FIELD_CONTROL_HOVER_CLASS");
  });
});
