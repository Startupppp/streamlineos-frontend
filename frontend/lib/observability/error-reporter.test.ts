import {
  reportError,
  resetErrorReporter,
  setErrorReporter,
  setSessionContext,
  type ErrorReport,
} from "./error-reporter";

describe("frontend error reporter", () => {
  let reports: ErrorReport[];

  beforeEach(() => {
    reports = [];
    setErrorReporter({ report: (r) => reports.push(r) });
  });
  afterEach(() => resetErrorReporter());

  it("does nothing harmful when no reporter is installed", () => {
    resetErrorReporter();
    expect(() => reportError(new Error("boom"))).not.toThrow();
  });

  it("forwards the error to the installed reporter", () => {
    const error = new Error("boom");
    reportError(error);
    expect(reports).toHaveLength(1);
    expect(reports[0].error).toBe(error);
  });

  it("attaches the signed-in organisation so a report can be traced to a customer", () => {
    setSessionContext({ orgId: "org-1", actorId: "user-1" });
    reportError(new Error("boom"));
    expect(reports[0].context).toMatchObject({ orgId: "org-1", actorId: "user-1" });
  });

  it("attaches the last correlation id so the report joins the backend's logs", () => {
    setSessionContext({ correlationId: "c-1" });
    reportError(new Error("boom"));
    expect(reports[0].context).toMatchObject({ correlationId: "c-1" });
  });

  it("records where in the app the failure happened", () => {
    reportError(new Error("boom"));
    expect(typeof reports[0].context.url).toBe("string");
  });

  it("redacts credentials passed as extra detail", () => {
    reportError(new Error("boom"), { route: "/crm", password: "hunter2" });
    expect(reports[0].extra).toEqual({ route: "/crm", password: "[redacted]" });
  });

  it("keeps the correlation id when the session changes, so reports stay joinable", () => {
    setSessionContext({ correlationId: "c-1" });
    setSessionContext({ orgId: "org-1", actorId: "user-1" });
    reportError(new Error("boom"));
    expect(reports[0].context).toMatchObject({ correlationId: "c-1", orgId: "org-1" });
  });

  it("never lets a failing reporter break the page", () => {
    setErrorReporter({
      report: () => {
        throw new Error("reporter is down");
      },
    });
    expect(() => reportError(new Error("boom"))).not.toThrow();
  });

  it("clears the session context on sign-out so a report is not misattributed", () => {
    setSessionContext({ orgId: "org-1", actorId: "user-1" });
    setSessionContext({});
    reportError(new Error("boom"));
    expect(reports[0].context.orgId).toBeUndefined();
    expect(reports[0].context.actorId).toBeUndefined();
  });
});
