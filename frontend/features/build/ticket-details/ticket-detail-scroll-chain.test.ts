import { readFileSync } from "node:fs";
import { join } from "node:path";

const pageSource = readFileSync(
  join(__dirname, "ticket-detail-page.tsx"),
  "utf8",
);

it("keeps the ticket body in a bounded flex scrollport like inbox preview", () => {
  expect(pageSource).toContain(
    "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row",
  );
  expect(pageSource).toContain(
    "min-h-0 min-w-0 flex-1 basis-0 overflow-y-auto bg-gradient-to-b from-card/80 to-background/40",
  );
  expect(pageSource).not.toContain("md:flex-row md:overflow-hidden");
  expect(pageSource).not.toContain("md:min-h-0 md:overflow-y-auto");
});
