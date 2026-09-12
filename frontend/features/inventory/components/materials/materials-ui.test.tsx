/**
 * The properties of the materials-pack surfaces that a screenshot cannot pin.
 *
 * These are deliberately narrow: they check the rules that reading the rendered
 * page cannot confirm — that status is never carried by colour alone, that the
 * seven quantity buckets are all shown separately, and that the client does not
 * recompute a number the server owns.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const DIR = __dirname;

function sources(): { path: string; source: string }[] {
  const out: { path: string; source: string }[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if ((p.endsWith(".tsx") || p.endsWith(".ts")) && !p.endsWith(".test.tsx") && !p.endsWith(".test.ts")) {
        out.push({ path: p, source: readFileSync(p, "utf8") });
      }
    }
  };
  walk(DIR);
  return out;
}

describe("B2 — every quantity bucket is shown separately", () => {
  const bar = readFileSync(join(DIR, "stock-bucket-bar.tsx"), "utf8");

  it.each([
    "onHand", "available", "reserved", "damaged", "quarantined", "picked", "inTransit",
  ])("renders %s", (bucket) => {
    expect(bar).toContain(`key: "${bucket}"`);
  });

  it("marks available as the emphasised figure — it is the only promisable one", () => {
    expect(bar).toMatch(/key: "available"[\s\S]{0,200}emphasis: true/);
  });

  it("explains each bucket rather than leaving the label to carry it", () => {
    const hints = bar.match(/hint: "/g) ?? [];
    expect(hints).toHaveLength(7);
  });
});

describe("status is never carried by colour alone", () => {
  const badges = readFileSync(join(DIR, "requirement-status.tsx"), "utf8");

  it("gives every requirement status a word", () => {
    for (const status of [
      "DRAFT", "REQUESTED", "RESERVED", "PARTIALLY_FULFILLED", "FULFILLED", "CANCELLED",
    ]) {
      expect(badges).toMatch(new RegExp(`${status}: \\{ label: "`));
    }
  });

  it("gives every requirement status an icon as well as a colour", () => {
    const icons = badges.match(/icon: [A-Z]\w+/g) ?? [];
    expect(icons.length).toBe(6);
  });

  it("gives every project status a word", () => {
    for (const status of ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]) {
      expect(badges).toMatch(new RegExp(`${status}: \\{ label: "`));
    }
  });

  it("says why a line is at risk rather than only that it is", () => {
    expect(badges).toContain("SHORT_NO_STOCK:");
    expect(badges).toContain("SHORT_AND_DUE:");
  });
});

describe("the client never recomputes what the server owns", () => {
  it("does not subtract one stock bucket from another anywhere in these files", () => {
    const offenders: string[] = [];
    // Availability is `on_hand − committed − blocked − quality_hold − outgoing`,
    // and is zero at a location that may not be sold from. A client that
    // subtracts two of those terms is silently over-stating every SKU with
    // damage, a quality hold, or stock riding in a van.
    const subtraction = /\b(onHand|available|reserved|damaged|quarantined|picked|inTransit)\s*-\s*\w*(Qty|Stock|onHand|reserved|committed)\b/;
    for (const { path, source } of sources()) {
      const flattened = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      if (subtraction.test(flattened)) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });
});

describe("motion respects the reader", () => {
  it("uses the shared reduced-motion variants rather than raw transitions", () => {
    for (const { path, source } of sources()) {
      if (!source.includes('from "framer-motion"')) continue;
      expect({ path, usesVariants: source.includes("useMotionVariants") }).toEqual({
        path,
        usesVariants: true,
      });
    }
  });

  it("caps stagger so a long board does not take a second to appear", () => {
    for (const { source } of sources()) {
      for (const match of source.matchAll(/delay: ([^,}]+)/g)) {
        expect(match[1]).toContain("Math.min");
      }
    }
  });
});

describe("every action names a verb", () => {
  const BANNED = ["Manage Stock", ">Submit<", ">Process<", ">Continue<", ">Done<", ">Action<"];

  it("avoids vague button labels", () => {
    const offenders: string[] = [];
    for (const { path, source } of sources()) {
      for (const banned of BANNED) if (source.includes(banned)) offenders.push(`${path}: ${banned}`);
    }
    expect(offenders).toEqual([]);
  });

  it("labels the two stock actions with what they do", () => {
    const row = readFileSync(join(DIR, "requirement-row.tsx"), "utf8");
    expect(row).toContain("Reserve Stock");
    expect(row).toContain("Release Reservation");
    expect(row).toContain("Confirm Reservation");
  });

  it("explains a disabled action instead of leaving it inert", () => {
    const row = readFileSync(join(DIR, "requirement-row.tsx"), "utf8");
    expect(row).toContain("reserveBlockedReason");
    expect(row).toMatch(/title=\{reserveBlockedReason/);
  });
});
