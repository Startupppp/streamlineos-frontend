import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { screenshotName } from "./acceptance-matrix.mjs";

export function makeScreenshotter(shotDir) {
  mkdirSync(shotDir, { recursive: true });
  return async function captureScreenshot(session, state, width, variant) {
    const name = screenshotName(state, width, variant);
    const path = join(shotDir, name);
    const shot = await session.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(path, Buffer.from(shot.data, "base64"));
    return path;
  };
}
