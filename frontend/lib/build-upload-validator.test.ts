import { validatePreUpload } from "./build-upload-validator";

const ALLOWED = new Set(["image/jpeg", "image/png"]);
const isAllowed = (file: File) => ALLOWED.has(file.type);

function fakeFile(name: string, size: number, type: string): File {
  return { name, size, type } as File;
}

describe("validatePreUpload", () => {
  it("returns null for a valid non-empty allowed file", () => {
    expect(
      validatePreUpload(fakeFile("photo.jpg", 1024, "image/jpeg"), isAllowed),
    ).toBeNull();
  });

  it("returns the empty message for a 0-byte file", () => {
    expect(
      validatePreUpload(fakeFile("empty.jpg", 0, "image/jpeg"), isAllowed),
    ).toBe("empty.jpg is empty");
  });

  it("returns the type message for a disallowed MIME type", () => {
    expect(
      validatePreUpload(
        fakeFile("qa-test.exe", 1024, "application/x-msdownload"),
        isAllowed,
      ),
    ).toBe("qa-test.exe is not an allowed file type.");
  });

  it("names the accepted types when the caller supplies a label, so the project files page keeps telling the user what it takes", () => {
    expect(
      validatePreUpload(
        fakeFile("qa-test.exe", 1024, "application/x-msdownload"),
        isAllowed,
        "PDF, JPG, PNG",
      ),
    ).toBe("qa-test.exe is not an accepted file type. Accepted: PDF, JPG, PNG.");
  });

  it("checks empty before type when both would fail", () => {
    expect(
      validatePreUpload(
        fakeFile("bad.exe", 0, "application/x-msdownload"),
        isAllowed,
      ),
    ).toBe("bad.exe is empty");
  });
});
