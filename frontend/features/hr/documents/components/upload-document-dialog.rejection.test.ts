import { uploadRejectionReason } from "./upload-document-dialog";

const f = (name: string, size: number) => ({ name, size });

describe("uploadRejectionReason", () => {
  it("accepts an allowed type within limits", () => {
    expect(uploadRejectionReason(f("contract.PDF", 1024))).toBeNull();
  });
  it("refuses executables and extensionless files", () => {
    expect(uploadRejectionReason(f("fake-app.exe", 1024))).toMatch(/type not allowed/);
    expect(uploadRejectionReason(f("README", 1024))).toMatch(/type not allowed/);
  });
  it("refuses empty files", () => {
    expect(uploadRejectionReason(f("empty.pdf", 0))).toBe("File is empty");
  });
  it("refuses files over 10MB", () => {
    expect(uploadRejectionReason(f("big.pdf", 12 * 1024 * 1024))).toMatch(/10MB/);
    expect(uploadRejectionReason(f("edge.pdf", 10 * 1024 * 1024))).toBeNull();
  });
});
