import { readFileSync } from "node:fs";

import {
  FE_ROOT,
  baseTag,
  collectSourceFiles,
  openingTags,
  posixRelative,
} from "./keyboard-reachability-analysis";
import {
  IMPLICIT_ROLE,
  NAMED_CONTROLS,
  NATIVE_FOCUSABLE,
  REFERENCE_ATTRIBUTES,
  UNNAMEABLE_INPUT_TYPES,
  VALID_ARIA_ATTRIBUTES,
  VALID_ROLES,
} from "./aria-vocabulary";

export interface AriaFinding {
  file: string;
  line: number;
  tag: string;
  detail: string;
}

export interface AriaSemantics {
  filesScanned: number;
  elements: number;
  ariaAttributes: number;
  roleAttributes: number;
  referenceAttributes: number;
  formControls: number;
  invalidRole: AriaFinding[];
  invalidAriaAttribute: AriaFinding[];
  danglingReference: AriaFinding[];
  hiddenFocusable: AriaFinding[];
  redundantRole: AriaFinding[];
  positiveTabIndex: AriaFinding[];
  unnamedControl: AriaFinding[];
}

export type AriaFindingKind = Exclude<
  {
    [K in keyof AriaSemantics]: AriaSemantics[K] extends AriaFinding[] ? K : never;
  }[keyof AriaSemantics],
  undefined
>;

export const FINDING_KINDS: readonly AriaFindingKind[] = [
  "invalidRole",
  "invalidAriaAttribute",
  "danglingReference",
  "hiddenFocusable",
  "redundantRole",
  "positiveTabIndex",
  "unnamedControl",
];

const ARIA_NAME = /\b(aria-[a-zA-Z-]+)/g;
const ROLE_LITERAL = /\brole="([^"]*)"/;
const TAB_INDEX = /\btabIndex=\{?\s*(-?\d+)/;
const SPREAD = /\{\s*\.\.\./;
const HIDDEN_CLASS = /className="[^"]*\bhidden\b/;
const ARIA_HIDDEN_TRUE = /\baria-hidden(?:="true"|=\{true\})?(?![-a-zA-Z])/;
const ARIA_HIDDEN_FALSE = /\baria-hidden=\{?(?:false|!)/;
const INPUT_TYPE = /\btype="([^"]*)"/;

const ID_LITERAL = /\b(?:id|htmlFor|[a-zA-Z]+Id)="([^"{}]+)"/g;

function idLiterals(source: string): Set<string> {
  const ids = new Set<string>();
  for (const match of source.matchAll(ID_LITERAL)) ids.add(match[1] as string);
  return ids;
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

const FORM_CONTROL_SLOT = /<FormControl[^>]*>\s*$/;

export function analyzeSource(source: string, file = ""): Omit<AriaSemantics, "filesScanned"> {
  const ids = idLiterals(source);
  const out: Omit<AriaSemantics, "filesScanned"> = {
    elements: 0,
    ariaAttributes: 0,
    roleAttributes: 0,
    referenceAttributes: 0,
    formControls: 0,
    invalidRole: [],
    invalidAriaAttribute: [],
    danglingReference: [],
    hiddenFocusable: [],
    redundantRole: [],
    positiveTabIndex: [],
    unnamedControl: [],
  };

  for (const site of openingTags(source)) {
    const tag = baseTag(site.tag);
    if (!/^[a-z]/.test(tag)) continue;
    out.elements += 1;

    const attributes = site.attributes;
    const line = lineOf(source, site.index);
    const at = (detail: string): AriaFinding => ({ file, line, tag, detail });

    ARIA_NAME.lastIndex = 0;
    for (const match of attributes.matchAll(ARIA_NAME)) {
      const name = match[1] as string;
      out.ariaAttributes += 1;
      if (!VALID_ARIA_ATTRIBUTES.has(name))
        out.invalidAriaAttribute.push(at(`${name} is not a WAI-ARIA attribute`));
    }

    const role = ROLE_LITERAL.exec(attributes);
    if (role) {
      out.roleAttributes += 1;
      const value = (role[1] as string).trim();
      for (const token of value.split(/\s+/))
        if (token && !VALID_ROLES.has(token))
          out.invalidRole.push(at(`role="${token}" is not a WAI-ARIA role`));
      if (IMPLICIT_ROLE[tag] === value)
        out.redundantRole.push(at(`role="${value}" restates <${tag}>`));
    }

    for (const attribute of REFERENCE_ATTRIBUTES) {
      const reference = new RegExp(`\\b${attribute}="([^"{}]+)"`).exec(attributes);
      if (!reference) continue;
      out.referenceAttributes += 1;
      for (const id of (reference[1] as string).trim().split(/\s+/))
        if (id && !ids.has(id))
          out.danglingReference.push(at(`${attribute}="${id}" resolves to nothing`));
    }

    const tabIndex = TAB_INDEX.exec(attributes);
    if (tabIndex && Number(tabIndex[1]) > 0)
      out.positiveTabIndex.push(at(`tabIndex=${tabIndex[1]} rewrites the tab order`));

    const removedFromTabOrder =
      (tabIndex !== null && Number(tabIndex[1]) < 0) ||
      HIDDEN_CLASS.test(attributes) ||
      /\bdisabled\b/.test(attributes);
    const focusable =
      NATIVE_FOCUSABLE.has(tag) || (tabIndex !== null && Number(tabIndex[1]) >= 0);
    if (
      ARIA_HIDDEN_TRUE.test(attributes) &&
      !ARIA_HIDDEN_FALSE.test(attributes) &&
      focusable &&
      !removedFromTabOrder
    )
      out.hiddenFocusable.push(at("aria-hidden on an element still in the tab order"));

    if (!NAMED_CONTROLS.has(tag)) continue;
    const type = INPUT_TYPE.exec(attributes);
    if (type && UNNAMEABLE_INPUT_TYPES.has(type[1] as string)) continue;
    out.formControls += 1;
    if (HIDDEN_CLASS.test(attributes)) continue;
    if (FORM_CONTROL_SLOT.test(source.slice(Math.max(0, site.index - 400), site.index)))
      continue;

    const selfNamed =
      /\baria-label[=\s]/.test(attributes) ||
      /\baria-labelledby/.test(attributes) ||
      /\btitle=/.test(attributes) ||
      /\bplaceholder=/.test(attributes) ||
      SPREAD.test(attributes);
    const ownId = /\bid="([^"{}]+)"/.exec(attributes);
    const labelled =
      ownId !== null &&
      new RegExp(`htmlFor="${(ownId[1] as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`).test(
        source,
      );
    const before = source.slice(0, site.index);
    const openLabel = before.lastIndexOf("<label");
    const wrapped = openLabel !== -1 && before.indexOf("</label>", openLabel) === -1;
    if (!selfNamed && !labelled && !wrapped)
      out.unnamedControl.push(at(`<${tag}> has no accessible name`));
  }

  return out;
}

export function analyzeAriaSemantics(): AriaSemantics {
  const files = collectSourceFiles(FE_ROOT);
  const total: AriaSemantics = {
    filesScanned: files.length,
    elements: 0,
    ariaAttributes: 0,
    roleAttributes: 0,
    referenceAttributes: 0,
    formControls: 0,
    invalidRole: [],
    invalidAriaAttribute: [],
    danglingReference: [],
    hiddenFocusable: [],
    redundantRole: [],
    positiveTabIndex: [],
    unnamedControl: [],
  };

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const result = analyzeSource(source, posixRelative(FE_ROOT, file));
    total.elements += result.elements;
    total.ariaAttributes += result.ariaAttributes;
    total.roleAttributes += result.roleAttributes;
    total.referenceAttributes += result.referenceAttributes;
    total.formControls += result.formControls;
    for (const kind of FINDING_KINDS) total[kind].push(...result[kind]);
  }

  return total;
}
