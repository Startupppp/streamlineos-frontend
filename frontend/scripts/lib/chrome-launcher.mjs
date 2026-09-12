import { existsSync } from "node:fs";

function buildWindowsCandidates() {
  const list = [];
  const pf = process.env["ProgramFiles"];
  const pf86 = process.env["ProgramFiles(x86)"];
  const local = process.env["LOCALAPPDATA"];
  if (pf) list.push(pf + "\\Google\\Chrome\\Application\\chrome.exe");
  if (pf86) {
    list.push(pf86 + "\\Google\\Chrome\\Application\\chrome.exe");
    list.push(pf86 + "\\Microsoft\\Edge\\Application\\msedge.exe");
  }
  if (local) list.push(local + "\\Google\\Chrome\\Application\\chrome.exe");
  list.push("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
  list.push("C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe");
  list.push("C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe");
  return list;
}

export const BROWSER_CANDIDATES = [
  process.env.CHROME_PATH,
  ...buildWindowsCandidates(),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

export function findBrowser(explicit) {
  if (explicit) return existsSync(explicit) ? explicit : null;
  for (const p of BROWSER_CANDIDATES) if (existsSync(p)) return p;
  return null;
}
