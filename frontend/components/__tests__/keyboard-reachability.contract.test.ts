import {
  analyzeKeyboardReachability,
  countClickSites,
  findUnreachableClickTargets,
} from "@/test-utils/keyboard-reachability-analysis";

/**
 * "Every interactive surface is keyboard-navigable" is a claim about the whole
 * corpus, and no number of rendered component suites can make it. This walks
 * every click target in the tree instead, so the claim carries a denominator.
 *
 * A ratchet, not a target. Lowering a number is a deliberate edit; raising one
 * fails review.
 */
const BASELINE = {
  minimumFiles: 3500,
  minimumClickSites: 600,
  unreachable: 9,
} as const;

const result = analyzeKeyboardReachability();

function report(sites: { file: string; line: number; tag: string }[]): string {
  const shown = sites
    .slice(0, 25)
    .map((site) => `${site.file}:${site.line} <${site.tag}>`);
  const suffix = sites.length > 25 ? ` … and ${sites.length - 25} more` : "";
  return `${sites.length}: ${shown.join(", ")}${suffix}`;
}

describe("keyboard reachability — the scan sees a real tree", () => {
  it("walks the whole frontend source corpus", () => {
    expect(result.filesScanned).toBeGreaterThanOrEqual(BASELINE.minimumFiles);
  });

  it("finds the click targets it is supposed to be judging", () => {
    expect(result.clickSites).toBeGreaterThanOrEqual(BASELINE.minimumClickSites);
  });
});

describe("every click target is operable from a keyboard", () => {
  it(`no more than ${BASELINE.unreachable} click targets are unreachable`, () => {
    const verdict =
      result.unreachable.length <= BASELINE.unreachable
        ? "within baseline"
        : report(result.unreachable);
    expect(verdict).toBe("within baseline");
  });

  it("prints the current fraction so a lowered baseline is a deliberate edit", () => {
    expect(result.unreachable.length).toBeLessThanOrEqual(BASELINE.unreachable);
    expect(result.clickSites - result.unreachable.length).toBeGreaterThan(0);
  });
});

describe("scan self-test — each verdict is reached for the stated reason", () => {
  it("a div that only takes a click is unreachable", () => {
    expect(
      findUnreachableClickTargets('<div onClick={handleOpen}>Open</div>'),
    ).toHaveLength(1);
  });

  it("a native button is reachable without saying anything", () => {
    expect(
      findUnreachableClickTargets('<button onClick={handleOpen}>Open</button>'),
    ).toHaveLength(0);
  });

  it("a div that handles a key itself is reachable", () => {
    expect(
      findUnreachableClickTargets(
        '<div onClick={handleOpen} onKeyDown={handleKey} role="button" tabIndex={0}>Open</div>',
      ),
    ).toHaveLength(0);
  });

  it("the shared activation spread is reachable", () => {
    expect(
      findUnreachableClickTargets("<div {...activationProps(handleOpen)}>Open</div>"),
    ).toHaveLength(0);
  });

  it("a PascalCase component is left to its own contract, not judged here", () => {
    expect(
      findUnreachableClickTargets("<TicketCard onClick={handleOpen} />"),
    ).toHaveLength(0);
  });

  it("BITE PROOF — role and tabIndex without a key handler is still unreachable", () => {
    expect(
      findUnreachableClickTargets(
        '<div role="button" tabIndex={0} onClick={handleOpen}>Open</div>',
      ),
    ).toHaveLength(1);
  });

  it("counts every lowercase click target, reachable or not", () => {
    expect(
      countClickSites(
        '<button onClick={a}>x</button><div onClick={b}>y</div><Card onClick={c} />',
      ),
    ).toBe(2);
  });

  it("counts a shared-helper spread too, so moving a site onto it never shrinks the denominator", () => {
    expect(countClickSites("<div {...activationProps(handleOpen)}>x</div>")).toBe(1);
  });

  it("counts the propagation shield too — the other shared helper a site is converted onto", () => {
    expect(countClickSites("<div {...propagationShield}>x</div>")).toBe(1);
  });

  it("BITE PROOF — a shielded site is reachable AND still in the denominator", () => {
    const source = "<div {...propagationShield}><button onClick={a}>x</button></div>";
    expect(findUnreachableClickTargets(source)).toHaveLength(0);
    expect(countClickSites(source)).toBe(2);
  });

  it("reads a multi-line handler without ending the tag inside the arrow", () => {
    const source = [
      "<div",
      "  onClick={handleOpen}",
      "  onKeyDown={(e) => {",
      "    if (e.key === \"Enter\") handleOpen();",
      "  }}",
      ">x</div>",
    ].join("\n");
    expect(findUnreachableClickTargets(source)).toHaveLength(0);
  });
});
