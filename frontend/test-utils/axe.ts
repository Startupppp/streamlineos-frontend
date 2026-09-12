import { configureAxe } from "jest-axe";

const axeComponent = configureAxe({
  rules: {
    region: { enabled: false },
  },
});

async function expectNoAxeViolations(container: Element): Promise<void> {
  const results = await axeComponent(container);
  expect(results).toHaveNoViolations();
}

/**
 * The rule id of every violating node on `container`, sorted.
 *
 * `expectNoAxeViolations` is the assertion to reach for and stays the default.
 * This exists for a surface carrying a *known*, named accessibility debt that
 * the caller does not own and must not silently absorb: asserting the exact list
 * still fails on a new rule, on an extra violating node, and — the property that
 * matters — on a debt that has since been fixed, which is what forces the named
 * list back down to empty instead of leaving a permanent exemption behind.
 *
 * One entry per violating node, not per rule, so two bad headings never read as
 * one.
 */
async function axeViolationIds(container: Element): Promise<string[]> {
  const results = await axeComponent(container);
  return results.violations.flatMap((violation) => violation.nodes.map(() => violation.id)).sort();
}

export { expectNoAxeViolations, axeViolationIds };
