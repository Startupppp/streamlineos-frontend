import { initConsoleCapture } from "./console-capture";

describe("console capture cannot break the host application", () => {
  const originals = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  afterEach(() => {
    console.log = originals.log;
    console.info = originals.info;
    console.warn = originals.warn;
    console.error = originals.error;
  });

  it("keeps console.error working when an argument is circular, because the app's own error reporter passes payloads that contain cycles and an unguarded JSON.stringify would make every console.error in the app throw", () => {
    console.error = jest.fn();
    initConsoleCapture();

    const circular: Record<string, unknown> = { message: "boom" };
    circular.self = circular;

    expect(() => console.error("report", circular)).not.toThrow();
  });

  it("keeps console.warn working when an argument is a BigInt, which JSON.stringify also refuses to serialise", () => {
    console.warn = jest.fn();
    initConsoleCapture();

    expect(() => console.warn("count", BigInt(7))).not.toThrow();
  });

  it("still forwards the call to the original console so capturing never silences the app's own logging", () => {
    const spy = jest.fn();
    console.error = spy;
    initConsoleCapture();

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    console.error("still printed", circular);

    expect(spy).toHaveBeenCalledWith("still printed", circular);
  });
});
