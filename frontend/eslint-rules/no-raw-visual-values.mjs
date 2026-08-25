/**
 * Fails the build when a raw visual value is introduced.
 *
 * The contract half of the wide refactor. Migrating every module is worth
 * little if the next feature adds `text-emerald-600 dark:text-emerald-300`
 * back — and it will, because that is what every example on the internet
 * shows. One way to make a visual decision means the other way has to stop
 * compiling.
 *
 * Scoped to what has actually been migrated. A rule that fires 11,000 times is
 * a rule someone disables, so it starts where the migration has reached and
 * widens as `docs/TOKEN-MIGRATION.md` records more batches done. Until then the
 * migrated modules are held and the rest are left alone rather than warned
 * about endlessly.
 */

/** Palette classes: `bg-emerald-500`, `dark:text-slate-300/70`. */
const PALETTE = /\b(?:dark:)?(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline|shadow|decoration|accent|caret|placeholder)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?:\/\d{1,3})?\b/;

/** Arbitrary type sizes: `text-[11px]`. */
const ARBITRARY_TYPE = /\btext-\[\d+(?:\.\d+)?(?:px|rem)\]/;

/** Raw colour literals inside a class string: `bg-[#0f172a]`, `text-[rgb(...)]`. */
const ARBITRARY_COLOUR = /\b(?:bg|text|border|ring|fill|stroke)-\[(?:#|rgb|hsl|oklch)/i;

const CHECKS = [
  [PALETTE, "palette", "reads a token instead — `text-status-success-ink`, `text-muted-foreground`. A literal colour needs a hand-written `dark:` twin, and roughly half the call sites in this codebase forgot theirs."],
  [ARBITRARY_TYPE, "type", "reads a step instead — `text-micro`, `text-dense`, `text-label`, or Tailwind's own `text-xs`/`text-sm`."],
  [ARBITRARY_COLOUR, "colour", "reads a token instead. A raw colour cannot follow the theme."],
];

export default {
  meta: {
    type: "problem",
    docs: { description: "Visual decisions read the token layer, not raw values." },
    schema: [],
    messages: {
      raw: "This {{kind}} value is hardcoded: `{{value}}`. It {{advice}}",
    },
  },

  create(context) {
    /** Only the literal text of a class string; ignores identifiers and logic. */
    function check(node, text) {
      for (const [pattern, kind, advice] of CHECKS) {
        const match = pattern.exec(text);
        if (!match) continue;
        context.report({ node, messageId: "raw", data: { kind, value: match[0], advice } });
        return;
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        // A class built by a template still ships the literal parts.
        if (typeof node.value?.cooked === "string") check(node, node.value.cooked);
      },
    };
  },
};
