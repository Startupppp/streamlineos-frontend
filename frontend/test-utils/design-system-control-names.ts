import { readFileSync } from "node:fs";

import {
  FE_ROOT,
  baseTag,
  collectSourceFiles,
  openingTags,
  posixRelative,
} from "./keyboard-reachability-analysis";

const NAME_REQUIRED_CONTROLS = new Map<string, string>([
  ["SelectTrigger", "combobox"],
  ["Checkbox", "checkbox"],
  ["Switch", "switch"],
  ["RadioGroupItem", "radio"],
]);

const ARIA_NAME = /\baria-(?:label|labelledby)\s*=/;
const SPREAD = /\{\s*\.\.\./;
const ID_ATTRIBUTE = /(?:^|\s)id\s*=\s*(\{[^]*?\}|"[^"]*"|'[^']*'|`[^`]*`)/;
const HTML_FOR = /\bhtmlFor\s*=\s*(\{[^]*?\}|"[^"]*"|'[^']*'|`[^`]*`)/g;
const FORM_CONTROL_OPEN = /<FormControl[^>]*>\s*$/;
const SELECT_VALUE_PLACEHOLDER = /<SelectValue[^>]*\splaceholder\s*=/;

export interface ControlNameFinding {
  file: string;
  line: number;
  control: string;
  role: string;
}

export interface ControlNameCensus {
  filesScanned: number;
  controls: number;
  namedControls: number;
  unnamed: ControlNameFinding[];
  byControl: Record<string, { total: number; unnamed: number }>;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function elementBody(source: string, from: number, control: string): string {
  const close = source.indexOf(`</${control}>`, from);
  const bounded = from + 600;
  return source.slice(from, close === -1 ? bounded : Math.min(close, bounded));
}

export function findUnnamedControls(source: string): ControlNameFinding[] {
  const labelTargets = new Set<string>(
    [...source.matchAll(HTML_FOR)].map((match) => normalize(match[1])),
  );
  const findings: ControlNameFinding[] = [];

  for (const site of openingTags(source)) {
    const control = baseTag(site.tag);
    const role = NAME_REQUIRED_CONTROLS.get(control);
    if (role === undefined) continue;
    if (ARIA_NAME.test(site.attributes)) continue;
    if (SPREAD.test(site.attributes)) continue;

    const id = site.attributes.match(ID_ATTRIBUTE);
    if (id && labelTargets.has(normalize(id[1]))) continue;

    const before = source.slice(Math.max(0, site.index - 300), site.index);
    if (FORM_CONTROL_OPEN.test(before)) continue;

    if (
      control === "SelectTrigger" &&
      SELECT_VALUE_PLACEHOLDER.test(elementBody(source, site.index, control))
    )
      continue;

    findings.push({
      file: "",
      line: source.slice(0, site.index).split("\n").length,
      control,
      role,
    });
  }
  return findings;
}

export function countControls(source: string): number {
  let total = 0;
  for (const site of openingTags(source))
    if (NAME_REQUIRED_CONTROLS.has(baseTag(site.tag))) total += 1;
  return total;
}

export function analyzeControlNames(): ControlNameCensus {
  const files = collectSourceFiles(FE_ROOT);
  const unnamed: ControlNameFinding[] = [];
  const byControl: Record<string, { total: number; unnamed: number }> = {};
  for (const control of NAME_REQUIRED_CONTROLS.keys())
    byControl[control] = { total: 0, unnamed: 0 };

  let controls = 0;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    let touched = false;
    for (const control of NAME_REQUIRED_CONTROLS.keys())
      if (source.includes(`<${control}`)) touched = true;
    if (!touched) continue;

    const relativePath = posixRelative(FE_ROOT, file);
    for (const site of openingTags(source)) {
      const control = baseTag(site.tag);
      const bucket = byControl[control];
      if (!bucket) continue;
      bucket.total += 1;
      controls += 1;
    }
    for (const finding of findUnnamedControls(source)) {
      unnamed.push({ ...finding, file: relativePath });
      const bucket = byControl[finding.control];
      if (bucket) bucket.unnamed += 1;
    }
  }

  return {
    filesScanned: files.length,
    controls,
    namedControls: controls - unnamed.length,
    unnamed,
    byControl,
  };
}

export { NAME_REQUIRED_CONTROLS };
