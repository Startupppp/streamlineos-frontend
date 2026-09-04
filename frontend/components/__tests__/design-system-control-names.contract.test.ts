import { createElement } from "react";
import {
  analyzeControlNames,
  countControls,
  findUnnamedControls,
  NAME_REQUIRED_CONTROLS,
} from "@/test-utils/design-system-control-names";
import {
  SelectValue,
  selectValuePlaceholderName,
} from "@/components/ui/select";

/**
 * The blind spot the sibling census declares in its own header, measured.
 *
 * `aria-semantics.contract` walks lowercase JSX elements and says so: "any
 * PascalCase component" is outside it, because a component's semantics are its
 * own contract. Every control this file judges is PascalCase, and each renders
 * an element whose ARIA role requires a name and refuses to take one from
 * content — so the visible text inside a `SelectTrigger` names nothing, and
 * the visible `<Label>` beside a `Switch` names nothing either unless it is
 * associated. The browser sweep found `button-name` on eight routes / 128
 * nodes over exactly this, and 128 nodes is only what 21 routes happened to
 * paint: the corpus is the real denominator.
 *
 * A ratchet, not a target. Lowering a number is a deliberate edit; raising one
 * fails review. The per-control numbers are pinned separately so a fix in one
 * component cannot pay for a regression in another, and the heaviest files are
 * pinned by name so 300 findings cannot quietly rotate between files while the
 * total holds still.
 *
 * WHAT A ZERO HERE WOULD NOT MEAN. This cannot tell whether a name is the
 * RIGHT name: `aria-label="Select"` on all 872 triggers would pass every
 * assertion below and be worse for a screen-reader user than the failure it
 * hides. That is why `SelectTrigger` has no generic default, and why the
 * ratchet is worth more than the count.
 */
const BASELINE = {
  minimumFiles: 3500,
  minimumControls: 1100,
  unnamed: 288,
  perControl: {
    SelectTrigger: 215,
    Checkbox: 21,
    Switch: 51,
    RadioGroupItem: 1,
  } as Record<string, number>,
  /**
   * Every file holding four or more unnamed controls, with its count. These
   * are the concentrations worth fixing first, and pinning them stops the
   * total holding still while the defects move house.
   */
  heaviestFiles: {
    "features/build/meetings/meetings-list-page.tsx": 4,
    "features/calendar/event-recurrence-editor.tsx": 4,
    "features/hr/forms/components/field-config-panel.tsx": 4,
    "features/hr/recruitment/jobs/create-job-form/publishing-settings-sections.tsx": 4,
    "features/users/user-directory-filters.tsx": 4,
  } as Record<string, number>,
} as const;

const result = analyzeControlNames();

function report(): string {
  const shown = result.unnamed
    .slice(0, 25)
    .map((f) => `${f.file}:${f.line} <${f.control}> (role=${f.role})`);
  const suffix =
    result.unnamed.length > 25 ? ` … and ${result.unnamed.length - 25} more` : "";
  return `${result.unnamed.length}: ${shown.join(", ")}${suffix}`;
}

describe("the control-name census sees a real corpus", () => {
  it("walks the whole frontend source tree", () => {
    expect(result.filesScanned).toBeGreaterThanOrEqual(BASELINE.minimumFiles);
  });

  it("finds the controls it is supposed to be judging", () => {
    expect(result.controls).toBeGreaterThanOrEqual(BASELINE.minimumControls);
  });

  /**
   * 280 of the call sites below are counted as named ONLY because
   * `SelectTrigger` turns a `SelectValue` placeholder into the accessible
   * name. Take that away and the scan keeps reporting them green over a
   * product full of anonymous comboboxes — a static rule is only as true as
   * the primitive it describes, so the primitive is asserted here rather than
   * assumed.
   */
  it("the placeholder rule this scan honours is one the primitive actually implements", () => {
    expect(
      selectValuePlaceholderName(
        createElement(SelectValue, { placeholder: "Priority" }),
      ),
    ).toBe("Priority");
    expect(selectValuePlaceholderName(createElement(SelectValue, {}))).toBeUndefined();
  });

  it("judges every control whose role requires a name it cannot take from content", () => {
    expect([...NAME_REQUIRED_CONTROLS.keys()].sort()).toEqual([
      "Checkbox",
      "RadioGroupItem",
      "SelectTrigger",
      "Switch",
    ]);
  });
});

describe("a design-system control carries an accessible name", () => {
  it(`no more than ${BASELINE.unnamed} controls are unnamed`, () => {
    const verdict =
      result.unnamed.length <= BASELINE.unnamed ? "within baseline" : report();
    expect(verdict).toBe("within baseline");
  });

  it("no single control type regresses behind the others", () => {
    const over = Object.entries(result.byControl)
      .filter(([name, counts]) => counts.unnamed > (BASELINE.perControl[name] ?? 0))
      .map(([name, counts]) => `${name}: ${counts.unnamed}`);
    expect(over).toEqual([]);
  });

  it("the heaviest files do not grow, and cannot be traded for one another", () => {
    const perFile = new Map<string, number>();
    for (const finding of result.unnamed)
      perFile.set(finding.file, (perFile.get(finding.file) ?? 0) + 1);
    const regressions = Object.entries(BASELINE.heaviestFiles)
      .filter(([file, allowed]) => (perFile.get(file) ?? 0) > allowed)
      .map(([file]) => `${file}: ${perFile.get(file)}`);
    const newConcentrations = [...perFile]
      .filter(
        ([file, count]) =>
          count >= 4 && !(file in BASELINE.heaviestFiles),
      )
      .map(([file, count]) => `${file}: ${count}`);
    expect([...regressions, ...newConcentrations]).toEqual([]);
  });
});

describe("census self-test — each verdict is reached for the stated reason", () => {
  it("a bare SelectTrigger is unnamed", () => {
    expect(
      findUnnamedControls("<SelectTrigger><SelectValue /></SelectTrigger>"),
    ).toHaveLength(1);
  });

  it("a SelectValue placeholder names its trigger", () => {
    expect(
      findUnnamedControls(
        '<SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>',
      ),
    ).toHaveLength(0);
  });

  it("a placeholder on a LATER trigger does not name an earlier bare one", () => {
    expect(
      findUnnamedControls(
        "<SelectTrigger><SelectValue /></SelectTrigger>" +
          '<SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>',
      ),
    ).toHaveLength(1);
  });

  it("an aria-label names any of them", () => {
    expect(
      findUnnamedControls('<Checkbox aria-label="Select notification: Payroll" />'),
    ).toHaveLength(0);
  });

  it("an id matched by a htmlFor in the same file is a label association", () => {
    expect(
      findUnnamedControls(
        '<Label htmlFor="tz">Timezone</Label><SelectTrigger id="tz"><SelectValue /></SelectTrigger>',
      ),
    ).toHaveLength(0);
  });

  it("an id with no matching htmlFor is not", () => {
    expect(
      findUnnamedControls('<SelectTrigger id="tz"><SelectValue /></SelectTrigger>'),
    ).toHaveLength(1);
  });

  it("a templated id matches a templated htmlFor", () => {
    expect(
      findUnnamedControls(
        "<Label htmlFor={`ch-${ch.value}`}>x</Label><Checkbox id={`ch-${ch.value}`} />",
      ),
    ).toHaveLength(0);
  });

  it("a FormControl wrapper is a label association, because FormLabel supplies the htmlFor", () => {
    expect(
      findUnnamedControls(
        "<FormControl>\n  <SelectTrigger>\n    <SelectValue />\n  </SelectTrigger>\n</FormControl>",
      ),
    ).toHaveLength(0);
  });

  it("a spread is the caller's to name, the same exclusion the reachability scan makes", () => {
    expect(findUnnamedControls("<Switch {...field} />")).toHaveLength(0);
  });

  it("a visible sibling label with no association does NOT name a control", () => {
    expect(
      findUnnamedControls("<Label>Timezone</Label><Switch checked={value} />"),
    ).toHaveLength(1);
  });

  it("counts every tracked control as the denominator, named or not", () => {
    expect(
      countControls(
        '<SelectTrigger aria-label="a" /><Checkbox /><Switch /><RadioGroupItem /><Button />',
      ),
    ).toBe(4);
  });

  it("an untracked component is not judged here", () => {
    expect(findUnnamedControls("<Button /><Input /><Tooltip />")).toHaveLength(0);
  });
});
