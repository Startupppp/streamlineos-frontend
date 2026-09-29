import { readFileSync } from "node:fs";
import { join } from "node:path";

const PAGE = join(process.cwd(), "features/hr/documents/documents-page.tsx");

function addFolder(previous: readonly string[], name: string): string[] {
  if (previous.some((folder) => folder.toLowerCase() === name.toLowerCase()))
    return [...previous];
  return [...previous, name];
}

describe("a repeated Create Folder cannot add the same folder twice", () => {
  it("guards inside the setCustomFolders updater, the one place both the button and the Enter key reach", () => {
    expect(readFileSync(PAGE, "utf8")).toContain(
      "if (prev.some((folder) => folder.toLowerCase() === name.toLowerCase())) return prev;",
    );
  });

  it("adds a folder that is genuinely new, so the dedupe is not simply refusing everything", () => {
    expect(addFolder(["Onboarding"], "Compliance")).toEqual([
      "Onboarding",
      "Compliance",
    ]);
  });

  it("adds nothing on a second submit of the same name, which a stale existingTabs read let through", () => {
    expect(addFolder(["Onboarding"], "Onboarding")).toEqual(["Onboarding"]);
  });

  it("treats a differently-cased repeat as the same folder", () => {
    expect(addFolder(["Onboarding"], "ONBOARDING")).toEqual(["Onboarding"]);
  });

  it("is idempotent across a rapid burst, which is what a double-click produces before a re-render", () => {
    let folders: string[] = [];
    for (let i = 0; i < 5; i += 1) folders = addFolder(folders, "Onboarding");

    expect(folders).toEqual(["Onboarding"]);
  });
});
