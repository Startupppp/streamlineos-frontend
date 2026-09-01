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

export { expectNoAxeViolations };
