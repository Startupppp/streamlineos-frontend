import { readFileSync } from "node:fs";
import { relative } from "node:path";
import {
  FE_ROOT,
  baseTag,
  collectSourceFiles,
  openingTags,
} from "./keyboard-reachability-analysis";

/**
 * The design system's own controls, named or not.
 *
 * `aria-semantics-analysis` writes its exclusions into its header, and the
 * first one is the reason this module exists: it walks **lowercase** JSX
 * elements only, because "`<Dialog>`'s semantics are its own contract and this
 * scan cannot see through the import". That is correct as far as it goes, and
 * it leaves the largest naming defect in the product invisible to it — every
 * control here is PascalCase.
 *
 * Each component below renders an element whose ARIA role **requires** an
 * accessible name and does **not** take one from its content:
 *
 *   SelectTrigger    -> `<button role="combobox">`
 *   Checkbox         -> `<button role="checkbox">`
 *   Switch           -> `<button role="switch">`
 *   RadioGroupItem   -> `<button role="radio">`
 *
 * Measured in Chrome via `Accessibility.getPartialAXTree`, not assumed:
 * `<button role="combobox"><span>Asia/Kolkata</span></button>` computes an
 * accessible name of `""`; a `<label for>` pointing at it computes the label's
 * text; a sibling `<label>` with no `for` computes `""` again. So the visible
 * text beside one of these controls is not a name, and the browser sweep found
 * `button-name` on eight routes over exactly this shape.
 *
 * WHAT COUNTS AS NAMED HERE, and each is a real mechanism rather than a
 * spelling:
 *  · `aria-label` / `aria-labelledby` on the control;
 *  · an `id` matched by a `htmlFor` in the same file — a `<label for>`;
 *  · sitting directly inside `<FormControl>`, which supplies `id={formItemId}`
 *    while `FormLabel` supplies the matching `htmlFor`;
 *  · a `SelectValue placeholder`, which `SelectTrigger` turns into the
 *    accessible name when nothing else supplies one;
 *  · a `{...spread}`, where the caller supplies the name — the same exclusion
 *    `findUnreachableClickTargets` makes, and for the same reason.
 *
 * WHAT THIS CANNOT SEE, and the ceiling is the same one the sibling census
 * declares: whether a name is the RIGHT name. `aria-label="Select"` on 873
 * comboboxes passes here and is worse for a screen-reader user than the
 * failure it hides, which is precisely why `SelectTrigger` has no generic
 * default. A name computed at runtime (`aria-label={label}`, a placeholder
 * expression) is honoured by presence, not by proof that it resolves to a
 * non-empty string. And a `htmlFor` is matched within one file: a label and a
 * control split across files reads as unnamed here.
 */

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
  /** Every call site of a name-required design-system control — the denominator. */
  controls: number;
  namedControls: number;
  unnamed: ControlNameFinding[];
  byControl: Record<string, { total: number; unnamed: number }>;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * The subtree of a control's own element, used only to look for the
 * `SelectValue` that supplies a trigger's placeholder. A trigger is a short,
 * self-closing-ish region; reading to its close tag or a bounded window is
 * enough and keeps this from walking a whole page.
 */
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

    const relativePath = relative(FE_ROOT, file);
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
