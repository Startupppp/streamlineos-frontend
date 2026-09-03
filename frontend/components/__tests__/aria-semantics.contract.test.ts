import {
  FINDING_KINDS,
  analyzeAriaSemantics,
  analyzeSource,
  type AriaFinding,
  type AriaFindingKind,
} from "@/test-utils/aria-semantics-analysis";

/**
 * The sibling of `keyboard-reachability.contract`. That one censuses whether a
 * keyboard can REACH a control; this one censuses what the assistive technology
 * is TOLD once it arrives — names, roles and ARIA references — over the same
 * corpus, with the same denominator discipline.
 *
 * WHAT A GREEN RUN HERE DOES NOT MEAN. This is a static walk. It cannot see a
 * missing focus trap, a name that exists but is wrong, an `aria-live` region
 * that never announces, or anything inside a PascalCase component. An
 * axe-style automated pass has the same shape of blind spot for a different
 * reason — it can only judge what a fixture happened to mount. Both together
 * are a floor, not coverage; the module header lists the exclusions in full.
 *
 * A ratchet, not a target. Lowering a number is a deliberate edit; raising one
 * fails review.
 */
const BASELINE: Record<AriaFindingKind, number> = {
  invalidRole: 0,
  invalidAriaAttribute: 0,
  danglingReference: 0,
  hiddenFocusable: 0,
  redundantRole: 0,
  /**
   * `features/crm/import/bulk-import-section.tsx` — CRM is excluded from this
   * release, so the finding is pinned rather than fixed. Pinned BY ROUTE below
   * as well as by count: a bare count would let one surface lose its name while
   * another gained one and the number would never move.
   */
  unnamedControl: 1,
  positiveTabIndex: 0,
};

const PINNED_UNNAMED_CONTROLS = ["features/crm/import/bulk-import-section.tsx"];

const result = analyzeAriaSemantics();

function report(findings: AriaFinding[]): string {
  const shown = findings
    .slice(0, 25)
    .map((f) => `${f.file}:${f.line} ${f.detail}`);
  const suffix = findings.length > 25 ? ` … and ${findings.length - 25} more` : "";
  return `${findings.length}: ${shown.join(", ")}${suffix}`;
}

describe("aria semantics — the scan sees a real tree", () => {
  it("walks the whole frontend source corpus", () => {
    expect(result.filesScanned).toBeGreaterThanOrEqual(3500);
  });

  it("judges a population large enough to carry the claim", () => {
    expect(result.elements).toBeGreaterThanOrEqual(20000);
    expect(result.ariaAttributes).toBeGreaterThanOrEqual(700);
    expect(result.roleAttributes).toBeGreaterThanOrEqual(150);
    expect(result.formControls).toBeGreaterThanOrEqual(95);
  });
});

describe("screen-reader semantics hold across the corpus", () => {
  for (const kind of FINDING_KINDS) {
    it(`${kind}: no more than ${BASELINE[kind]}`, () => {
      const findings = result[kind];
      const verdict =
        findings.length <= BASELINE[kind] ? "within baseline" : report(findings);
      expect(verdict).toBe("within baseline");
    });
  }

  it("the one pinned unnamed control is still the CRM one, not a new surface", () => {
    expect(result.unnamedControl.map((f) => f.file).sort()).toEqual(
      PINNED_UNNAMED_CONTROLS,
    );
  });
});

const one = (source: string, kind: AriaFindingKind): AriaFinding[] =>
  analyzeSource(source)[kind];

describe("scan self-test — each verdict is reached for the stated reason", () => {
  it("a misspelled ARIA attribute is caught", () => {
    expect(one('<div aria-labeledby="x">y</div>', "invalidAriaAttribute")).toHaveLength(1);
  });

  it("a correctly spelled one is not", () => {
    expect(one('<div id="x" aria-labelledby="x">y</div>', "invalidAriaAttribute")).toHaveLength(0);
  });

  it("an invented role is caught", () => {
    expect(one('<div role="widget">y</div>', "invalidRole")).toHaveLength(1);
  });

  it("a real role is not", () => {
    expect(one('<div role="toolbar">y</div>', "invalidRole")).toHaveLength(0);
  });

  it("a role restating its element is caught", () => {
    expect(one('<button role="button">y</button>', "redundantRole")).toHaveLength(1);
  });

  it("a role the element does not already carry is left alone", () => {
    expect(one('<div role="button" tabIndex={0}>y</div>', "redundantRole")).toHaveLength(0);
  });

  it("an aria-labelledby pointing at nothing is caught", () => {
    expect(one('<section aria-labelledby="ghost">y</section>', "danglingReference")).toHaveLength(1);
  });

  it("one pointing at an id in the same file resolves", () => {
    expect(
      one('<h2 id="real">t</h2><section aria-labelledby="real">y</section>', "danglingReference"),
    ).toHaveLength(0);
  });

  it("an id threaded through a prop resolves too — the documented heuristic", () => {
    expect(
      one('<Head titleId="real" /><section aria-labelledby="real">y</section>', "danglingReference"),
    ).toHaveLength(0);
  });

  it("aria-hidden on a tabbable control is caught", () => {
    expect(one('<button aria-hidden onClick={a}>y</button>', "hiddenFocusable")).toHaveLength(1);
  });

  it("aria-hidden on one taken out of the tab order is not", () => {
    expect(
      one('<button aria-hidden tabIndex={-1} onClick={a}>y</button>', "hiddenFocusable"),
    ).toHaveLength(0);
  });

  it("aria-hidden on a display:none control is not", () => {
    expect(
      one('<input type="file" className="hidden" aria-hidden onChange={a} />', "hiddenFocusable"),
    ).toHaveLength(0);
  });

  it("a positive tabIndex is caught", () => {
    expect(one("<div tabIndex={3}>y</div>", "positiveTabIndex")).toHaveLength(1);
  });

  it("tabIndex 0 and -1 are not", () => {
    expect(one("<div tabIndex={0}>y</div><div tabIndex={-1}>y</div>", "positiveTabIndex")).toHaveLength(0);
  });

  it("an input with no name at all is caught", () => {
    expect(one("<input value={v} onChange={a} />", "unnamedControl")).toHaveLength(1);
  });

  it("an aria-label names it", () => {
    expect(one('<input aria-label="Search" value={v} />', "unnamedControl")).toHaveLength(0);
  });

  it("a wrapping label names it, natively", () => {
    expect(one('<label>Name<input value={v} /></label>', "unnamedControl")).toHaveLength(0);
  });

  it("an htmlFor pointing at its id names it, natively", () => {
    expect(
      one('<label htmlFor="n">Name</label><input id="n" value={v} />', "unnamedControl"),
    ).toHaveLength(0);
  });

  it("a control inside FormControl is named by construction, not judged here", () => {
    expect(
      one("<FormControl><input type=\"checkbox\" checked={v} /></FormControl>", "unnamedControl"),
    ).toHaveLength(0);
  });

  it("a PascalCase component is left to its own contract", () => {
    expect(one('<Input value={v} />', "unnamedControl")).toHaveLength(0);
    expect(one('<Section role="widget" />', "invalidRole")).toHaveLength(0);
  });

  it("BITE PROOF — an htmlFor that points somewhere else does NOT name the control", () => {
    expect(
      one('<label htmlFor="other">Name</label><input id="n" value={v} />', "unnamedControl"),
    ).toHaveLength(1);
  });

  it("BITE PROOF — a closed label before the input does not wrap it", () => {
    expect(
      one("<label>Other</label><input value={v} />", "unnamedControl"),
    ).toHaveLength(1);
  });

  it("BITE PROOF — the reference check reads every token, not just the first", () => {
    expect(
      one('<h2 id="a">t</h2><div aria-labelledby="a ghost">y</div>', "danglingReference"),
    ).toHaveLength(1);
  });

  it("BITE PROOF — aria-hidden={false} is not aria-hidden", () => {
    expect(
      one("<button aria-hidden={false} onClick={a}>y</button>", "hiddenFocusable"),
    ).toHaveLength(0);
  });

  it("counts every lowercase element it walked, so a finding always has a denominator", () => {
    const scan = analyzeSource("<div><span/><Card/><input value={v} /></div>");
    expect(scan.elements).toBe(3);
    expect(scan.formControls).toBe(1);
  });

  it("BITE PROOF — an excluded control stays IN the denominator, so a conversion never shrinks it", () => {
    const bare = analyzeSource('<input value={v} />');
    const hidden = analyzeSource('<input className="hidden" value={v} />');
    expect(bare.unnamedControl).toHaveLength(1);
    expect(hidden.unnamedControl).toHaveLength(0);
    expect(hidden.formControls).toBe(bare.formControls);
  });
});
