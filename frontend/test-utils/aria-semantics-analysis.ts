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

/**
 * Screen-reader semantics across the whole corpus, with a denominator.
 *
 * Reachability is already censused by `keyboard-reachability-analysis`. That
 * scan answers "can a keyboard get there"; it says nothing about what the
 * assistive technology is told once it arrives. This one walks the same tree
 * and judges the naming and role layer instead.
 *
 * WHAT THIS CANNOT SEE — read this before treating a zero as coverage:
 *  · whether a name is CORRECT. `aria-label="Button"` on a delete control is a
 *    pass here and a defect in the product. Only a human or a real AT session
 *    can judge a name's content.
 *  · whether focus is TRAPPED in a dialog or RESTORED to its trigger, and
 *    whether a route change moves focus. Those are runtime behaviours; the
 *    rendered suites in `components/ui/__tests__/overlay-focus.a11y.test.tsx`
 *    and `components/layout/__tests__` own them.
 *  · whether an `aria-live` region actually announces. Presence is not
 *    announcement — the region has to exist before the text changes.
 *  · reading order, or anything that depends on the painted layout.
 *  · any PascalCase component. `<Dialog>`'s semantics are its own contract and
 *    this scan cannot see through the import.
 *  · a name computed at runtime. `aria-label={label}` counts as named without
 *    proving `label` is a non-empty string.
 *  · an id threaded through a prop is honoured by NAME, not by proof:
 *    `titleId="x"` satisfies `aria-labelledby="x"` because the literal appears
 *    as an id-valued attribute in the file. That is a heuristic chosen to avoid
 *    fabricating findings, and it is weaker than following the render.
 *
 * The classes below are the ones a static walk CAN decide, and each one is a
 * defect a browser will not report and an axe pass over a rendered fixture
 * would only find on the pages that fixture happens to mount.
 */

export interface AriaFinding {
  file: string;
  line: number;
  tag: string;
  detail: string;
}

export interface AriaSemantics {
  filesScanned: number;
  /** Every lowercase JSX element walked — the population the checks ran over. */
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

/**
 * Any literal that is used as an id in this file — `id="x"`, `htmlFor="x"` and
 * any camelCase `…Id="x"` prop, which is how an id reaches a child component.
 */
const ID_LITERAL = /\b(?:id|htmlFor|[a-zA-Z]+Id)="([^"{}]+)"/g;

function idLiterals(source: string): Set<string> {
  const ids = new Set<string>();
  for (const match of source.matchAll(ID_LITERAL)) ids.add(match[1] as string);
  return ids;
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

/**
 * A control inside `<FormControl>` is named by construction: the shadcn wrapper
 * is a Radix Slot that stamps `id={formItemId}` onto its child while `FormLabel`
 * stamps the matching `htmlFor`. Judging the raw `<input>` there reports a
 * defect the runtime does not have.
 */
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
    /**
     * Counted BEFORE the exclusions below, deliberately. If a control left the
     * denominator by becoming display:none or by moving inside `FormControl`,
     * converting a finding would shrink the population it was counted against
     * and the ratio would improve because the question was withdrawn.
     */
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
