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

const HUES = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/**
 * Flags only what a token can express.
 *
 * A rule that demands the impossible gets disabled. The set now has `surface`,
 * `ink`, `rule` and `fill`, so tints, washes, text, borders and solid fills are
 * all flaggable.
 *
 * Two things are still left alone. **Gradients** (`from-`/`to-`/`via-`) have no
 * role and it is not obvious one should exist — a gradient is closer to an
 * illustration than to a decision. And an **arbitrary alpha** (`bg-sky-300/[0.12]`)
 * is a decorative wash at a hand-tuned opacity, not a semantic surface. Both are
 * recorded in docs/TOKEN-MIGRATION.md.
 */
const PALETTE = new RegExp(
  "\\b(?:(?:\\[[^\\]]+\\]|[a-z-]+):)*!?" +
    // Surfaces and fills: any shade, with or without a fractional alpha.
    `(?:bg-(?:${HUES})-\\d{2,3}(?:\\/\\d{1,3})?\\b(?!\\/\\[)` +
    // Ink and rules at any shade.
    `|(?:text|border|ring|divide|decoration|placeholder)-(?:${HUES})-\\d{2,3}(?:\\/\\d{1,3})?\\b(?!\\/\\[)` +
    /*
     * Gradient stops. `via` is excluded: a middle stop between two tokens is a
     * decision the two ends already make, and naming one would be a token that
     * exists to be overridden.
     */
    `|(?:from|to)-(?:${HUES})-\\d{2,3}(?:\\/\\d{1,3})?\\b(?!\\/\\[))`,
);

/** Arbitrary type sizes: `text-[11px]`. */
const ARBITRARY_TYPE = /\btext-\[\d+(?:\.\d+)?(?:px|rem)\]/;

/** Raw colour literals inside a class string: `bg-[#0f172a]`, `text-[rgb(...)]`. */
const ARBITRARY_COLOUR = /\b(?:bg|text|border|ring|fill|stroke)-\[(?:#|rgb|hsl|oklch)/i;

/**
 * A hand-written shadow. `shadow-card`, `shadow-panel` and `shadow-raised` name
 * the three elevations the product actually uses, and unlike a literal they are
 * redefined under `.dark` — a hand-written shadow shows its light-mode self on
 * a dark ground.
 */
const ARBITRARY_SHADOW = /\bshadow-\[[^\]]*(?:rgba?\(|#|_[0-9]+px)/;

/** A hand-written radius or spacing, where the scale already has a step. */
const ARBITRARY_RADIUS = /\brounded(?:-[a-z]+)?-\[(?!inherit\])[^\]]+\]/;
const ARBITRARY_SPACING = /\b(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-\[[0-9.]+(?:px|rem|em)\]/;

const CHECKS = [
  [PALETTE, "palette", "reads a token instead — `from-gradient-info-from`/`to-gradient-info-to` for a gradient, `bg-status-success-fill` for a solid, `bg-status-success-surface` for a wash, `text-muted-foreground` for quiet text, or `categoryClasses()` when the colour names a category rather than a status. A literal needs a hand-written `dark:` twin, and roughly half the call sites in this codebase forgot theirs."],
  [ARBITRARY_TYPE, "type", "reads a step instead — `text-micro`, `text-dense`, `text-label`, or Tailwind's own `text-xs`/`text-sm`."],
  [ARBITRARY_COLOUR, "colour", "reads a token instead. A raw colour cannot follow the theme."],
  [ARBITRARY_SHADOW, "shadow", "reads an elevation instead — `shadow-card`, `shadow-panel`, `shadow-raised`. A hand-written shadow shows its light-mode self on a dark ground."],
  [ARBITRARY_RADIUS, "radius", "reads a step instead — `rounded-md`, `rounded-lg`, `rounded-full`. (`rounded-[inherit]` is allowed; it defers rather than decides.)"],
  [ARBITRARY_SPACING, "spacing", "reads a step instead — the scale has one, and an off-scale value is what makes rhythm drift."],
];

export default {
  meta: {
    type: "problem",
    docs: { description: "Visual decisions read the token layer, not raw values." },
    schema: [
      {
        type: "object",
        properties: {
          /**
           * Kinds this surface is not held to. Named rather than achieved by
           * dropping the file into `ignores`, which switches the whole rule off
           * — including the colour check, which is the one that silently breaks
           * dark mode. Relaxing one kind should not cost the others.
           */
          skip: {
            type: "array",
            items: { enum: ["palette", "type", "colour", "shadow", "radius", "spacing"] },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      raw: "This {{kind}} value is hardcoded: `{{value}}`. It {{advice}}",
    },
  },

  create(context) {
    const skipped = new Set(context.options[0]?.skip ?? []);
    const active = CHECKS.filter(([, kind]) => !skipped.has(kind));

    /** Only the literal text of a class string; ignores identifiers and logic. */
    function check(node, text) {
      for (const [pattern, kind, advice] of active) {
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
