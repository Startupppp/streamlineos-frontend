import { readFileSync } from "node:fs";
import { join } from "node:path";

const basics = readFileSync(join(__dirname, "steps/step-basics.tsx"), "utf8");
const wizard = readFileSync(join(__dirname, "project-create-wizard.tsx"), "utf8");

describe("New Project name field stability + Escape (F4)", () => {
  it("uses explicit value/onChange like Create Issue title (no field spread on name)", () => {
    const nameBlock = basics.slice(
      basics.indexOf('name="name"'),
      basics.indexOf('name="key"'),
    );
    expect(nameBlock).toMatch(/value=\{field\.value/);
    expect(nameBlock).toMatch(/onChange=\{/);
    expect(nameBlock).not.toMatch(/\{\.\.\.field\}/);
    expect(nameBlock).toMatch(/Escape/);
  });

  it("routes Escape from the name field to request close", () => {
    expect(basics).toMatch(/onCancel/);
    expect(wizard).toMatch(/onCancel=\{requestClose\}/);
  });

  it("keeps Sheet onEscapeKeyDown wired to requestClose", () => {
    expect(wizard).toMatch(/onEscapeKeyDown/);
    expect(wizard).toMatch(/requestClose/);
  });
});
