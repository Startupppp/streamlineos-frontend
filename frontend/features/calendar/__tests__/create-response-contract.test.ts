import * as fs from "fs";
import * as path from "path";
import { backendPath } from "@/test-utils/backend-repo";

const FE_ROOT = path.join(__dirname, "..", "..", "..");
const HOOKS = path.join(FE_ROOT, "hooks", "api", "calendar-mutations.ts");
const DIALOG = path.join(FE_ROOT, "features", "calendar", "use-event-create-dialog.ts");
const BACKEND_SERVICE = backendPath("src", "modules", "calendar", "calendar.service.ts");

function responseInterfaceBody(): string {
  const source = fs.readFileSync(HOOKS, "utf8");
  const block = /interface MutateCalendarEventResponse \{([\s\S]*?)\n\}/.exec(source);
  expect(block).not.toBeNull();
  return block?.[1] ?? "";
}

function declaredFields(): string[] {
  return responseInterfaceBody()
    .split("\n")
    .map((line) => /^\s*([A-Za-z][A-Za-z0-9]*)\??:/.exec(line)?.[1])
    .filter((name): name is string => name !== undefined);
}

describe("calendar create response contract", () => {
  it("the backend sends no syncError from any route", () => {
    const backendSrc = backendPath("src");
    const hits: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.ts$/.test(entry.name)) continue;
        if (fs.readFileSync(full, "utf8").includes("syncError")) hits.push(full);
      }
    };
    walk(backendSrc);
    expect(hits).toEqual([]);
  });

  it("declares no field the backend's createEvent return does not carry", () => {
    const source = fs.readFileSync(BACKEND_SERVICE, "utf8");
    const returned = /return\s*\{\s*event,\s*oooConflicts,\s*eventConflicts,\s*meetingUrl:\s*null,\s*syncQueued:\s*([^}]*)\};/.exec(
      source,
    );
    expect(returned).not.toBeNull();
    const serverFields = new Set([
      "event",
      "oooConflicts",
      "eventConflicts",
      "meetingUrl",
      "syncQueued",
    ]);
    for (const field of declaredFields()) expect(serverFields.has(field)).toBe(true);
  });

  it("declares syncQueued, which the server does send", () => {
    expect(declaredFields()).toContain("syncQueued");
  });

  it("the create dialog branches on no field the response type does not declare", () => {
    const dialog = fs.readFileSync(DIALOG, "utf8");
    const declared = new Set(declaredFields());
    const referenced = [...dialog.matchAll(/\bres\.([A-Za-z][A-Za-z0-9]*)/g)].map((m) => m[1]);
    expect(referenced.length).toBeGreaterThan(0);
    for (const field of referenced) expect(declared.has(field ?? "")).toBe(true);
  });
});
