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

async function axeViolationIds(container: Element): Promise<string[]> {
  const results = await axeComponent(container);
  return results.violations.flatMap((violation) => violation.nodes.map(() => violation.id)).sort();
}

export { expectNoAxeViolations, axeViolationIds };
