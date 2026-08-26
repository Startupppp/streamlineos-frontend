/**
 * Flags a raw <button> element that contains only *Icon-named components and
 * carries none of the standard accessible-name attributes.
 *
 * The component type system enforces this for AnimatedIconButton via a
 * discriminated union that requires either `aria-label` or `children` text.
 * That guard is invisible at the call site when someone writes a raw <button>
 * — the type erases, the accessible name is silently absent, and a screen
 * reader user hears nothing but "button".
 *
 * Conservative by design — the rule skips four patterns it cannot resolve
 * statically:
 *
 *   1. expression-container children ({label}, {t("x")}) — may render text
 *   2. props/rest spreads ({...props}, {...rest}) — caller supplies aria-label
 *   3. lowercase HTML-element children (<span>, <div>) — may contain text
 *   4. PascalCase non-icon children (name does not end in "Icon") — may render
 *      text or complex UI (e.g. <TruncatedText>, <Avatar>)
 *
 * Only the clear case is flagged: every JSX child's name ends in "Icon" and
 * no static evidence of a visible label exists.
 *
 * Escape hatch for confirmed false positives:
 *   // eslint-disable-next-line streamline/no-unlabelled-icon-button -- <reason>
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Every icon-only <button> must carry aria-label, aria-labelledby, or title so screen readers can announce its purpose.",
    },
    schema: [],
    messages: {
      missing:
        "This <button> has only icon children and no accessible name. Add aria-label=\"…\", aria-labelledby, or title. If it already carries visible text, the rule is a false positive — suppress with // eslint-disable-next-line streamline/no-unlabelled-icon-button and a brief justification.",
    },
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          node.name.name !== "button"
        )
          return;

        const hasAccessibleName = node.attributes.some((attr) => {
          if (attr.type !== "JSXAttribute") return false;
          if (attr.name.type !== "JSXIdentifier") return false;
          return (
            attr.name.name === "aria-label" ||
            attr.name.name === "aria-labelledby" ||
            attr.name.name === "title"
          );
        });

        if (hasAccessibleName) return;

        const hasPropsSpread = node.attributes.some(
          (attr) =>
            attr.type === "JSXSpreadAttribute" &&
            attr.argument.type === "Identifier" &&
            /^(props|rest|[a-zA-Z]*[Pp]rops|[a-zA-Z]*[Aa]ttrs?)$/.test(
              attr.argument.name,
            ),
        );

        if (hasPropsSpread) return;

        const parent = node.parent;
        const children = parent.children ?? [];

        if (children.length === 0) return;

        const hasVisibleText = children.some((child) => {
          if (child.type === "JSXText") return child.value.trim() !== "";
          if (child.type === "JSXExpressionContainer") return true;
          if (child.type === "JSXElement") {
            const childName = child.openingElement?.name;
            if (childName?.type !== "JSXIdentifier") return true;
            if (/^[a-z]/.test(childName.name)) return true;
            if (!/Icon$/.test(childName.name)) return true;
          }
          return false;
        });

        if (hasVisibleText) return;

        const hasIconChild = children.some((child) => {
          if (child.type === "JSXFragment") return true;
          if (child.type !== "JSXElement") return false;
          const childName = child.openingElement?.name;
          return (
            childName?.type === "JSXIdentifier" && /Icon$/.test(childName.name)
          );
        });

        if (hasIconChild) {
          context.report({ node, messageId: "missing" });
        }
      },
    };
  },
};
