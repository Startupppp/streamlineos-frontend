import { matchingHeader } from "./bulk-send-row-utils";

describe("bulk send maps CSV columns named after the field", () => {
  it("maps name and email headers whatever their case or spacing", () => {
    const headers = ["Name", " EMAIL ", "Company"];

    expect(matchingHeader(headers, "name")).toBe("Name");
    expect(matchingHeader(headers, "email")).toBe(" EMAIL ");
  });

  it("leaves a field unmapped when no header has its name", () => {
    expect(matchingHeader(["Full name", "Mail"], "email")).toBe("");
  });
});
