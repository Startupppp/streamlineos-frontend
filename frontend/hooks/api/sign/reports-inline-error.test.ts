import { useSignDashboard, useSignSummary } from "./reports";

const captured: { key: string; options: { throwOnError?: unknown } }[] = [];

jest.mock("@/hooks/api/gated-query", () => ({
  useGatedQuery: (key: string, options: { throwOnError?: unknown }) => {
    captured.push({ key, options });
    return {};
  },
}));

describe("Sign reports reads keep their page and show its inline error", () => {
  beforeEach(() => {
    captured.length = 0;
  });

  it("does not throw the summary read into the route error boundary", () => {
    useSignSummary();
    expect(captured[0]?.options.throwOnError).toBe(false);
  });

  it("does not throw the dashboard read into the route error boundary", () => {
    useSignDashboard();
    expect(captured[0]?.options.throwOnError).toBe(false);
  });
});
