import { RecordDetail, RecordForm, RecordList } from "./index";

describe("renderer barrel", () => {
  it("exports the three primary components", () => {
    expect(typeof RecordDetail).toBe("function");
    expect(typeof RecordForm).toBe("function");
    expect(typeof RecordList).toBe("function");
  });
});
