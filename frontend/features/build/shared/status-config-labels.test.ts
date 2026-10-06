import { buildStatusConfig, statusConfig } from "./types";

describe("buildStatusConfig human labels", () => {
  it("keeps friendly labels for known status enums instead of raw IN PROGRESS", () => {
    const config = buildStatusConfig([
      { name: "TODO", color: null, type: "unstarted" },
      { name: "IN_PROGRESS", color: null, type: "started" },
    ]);
    expect(config.TODO.label).toBe(statusConfig.TODO.label);
    expect(config.IN_PROGRESS.label).toBe(statusConfig.IN_PROGRESS.label);
    expect(config.IN_PROGRESS.label).toBe("In Progress");
    expect(config.TODO.label).toBe("To Do");
  });
});
