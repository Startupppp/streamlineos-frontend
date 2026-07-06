#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ICON_TO_PRESET = {
  Users: "team",
  UsersRound: "team",
  User: "person",
  Mail: "mail",
  MailOpen: "mail",
  Key: "security",
  KeyRound: "security",
  History: "activity",
  Monitor: "devices",
  Laptop: "devices",
  Lock: "security",
  Shield: "security",
  ShieldOff: "security",
  ShieldCheck: "security",
  ShieldAlert: "security",
  Archive: "archive",
  Package: "inventory",
  Zap: "automations",
  Layers: "projects",
  FileText: "documents",
  ClipboardList: "documents",
  LayoutTemplate: "documents",
  LayoutGrid: "knowledge",
  Search: "search",
  Upload: "upload",
  Download: "upload",
  Star: "knowledge",
  Clock: "calendar",
  Plane: "travel",
  Award: "learning",
  AlertCircle: "alert",
  Building2: "companies",
  GitBranch: "companies",
  MapPin: "companies",
  DollarSign: "payroll",
  Network: "companies",
  BarChart2: "chart",
  BarChart3: "chart",
  Diamond: "projects",
  Variable: "settings",
  Share2: "leads",
  Trash2: "archive",
  ClipboardCheck: "approval",
  GitCompare: "settings",
};

const files = execSync(
  `rg -l 'illustration=\\{<[A-Z][a-zA-Z0-9]+ className' frontend --glob '*.{ts,tsx}'`,
  { cwd: process.cwd(), encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);

let changed = 0;

for (const rel of files) {
  const filePath = path.join(process.cwd(), rel);
  let src = fs.readFileSync(filePath, "utf8");
  const original = src;

  for (const [icon, preset] of Object.entries(ICON_TO_PRESET)) {
    const patterns = [
      new RegExp(
        `illustration=\\{<${icon} className="[^"]*"\\s*/>\\}`,
        "g",
      ),
      new RegExp(
        `illustration=\\{<${icon} className="[^"]*" fill="[^"]*"\\s*/>\\}`,
        "g",
      ),
      new RegExp(
        `illustration=\\{<${icon} className='[^']*'\\s*/>\\}`,
        "g",
      ),
    ];

    for (const pattern of patterns) {
      src = src.replace(pattern, `illustrationPreset="${preset}"`);
    }
  }

  if (src !== original) {
    fs.writeFileSync(filePath, src);
    changed++;
    console.log("updated:", rel);
  }
}

console.log(`\nDone. Updated ${changed} files.`);
