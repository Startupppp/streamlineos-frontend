import { keyResultPercent } from "./constants";

function keyResult(currentValue: string) {
  return {
    metricType: "number" as const,
    startValue: "0",
    targetValue: "200",
    currentValue,
  };
}

it("preserves one decimal place for key-result progress", () => {
  expect(keyResultPercent(keyResult("199"))).toBe(99.5);
});

it("clamps fractional progress at the bounds", () => {
  expect(keyResultPercent(keyResult("-1"))).toBe(0);
  expect(keyResultPercent(keyResult("201"))).toBe(100);
});
