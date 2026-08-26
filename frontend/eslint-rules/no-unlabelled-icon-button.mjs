/**
 * Flags a raw <button> element that contains only JSX element children (icon
 * components) and carries none of the standard accessible-name attributes.
 *
 * The component type system enforces this for AnimatedIconButton via a
 * discriminated union that requires either `aria-label` or `children` text.
 * That guard is invisible at the call site when someone writes a raw <button>
 * — the type erases, the accessible name is silently absent, and a screen
 * reader user hears nothing but "button".
 *
 * Conservative: expression-container children ({label}, {t("x")}) are skipped
 * because we cannot resolve them statically. The rule flags only the clear
 * case — all children are JSX elements with no visible text node.
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

        const parent = node.parent;
        const children = parent.children ?? [];

        if (children.length === 0) return;

        const hasVisibleText = children.some((child) => {
          if (child.type === "JSXText") return child.value.trim() !== "";
          if (child.type === "JSXExpressionContainer") return true;
          return false;
        });

        if (hasVisibleText) return;

        const hasIconChild = children.some(
          (child) => child.type === "JSXElement" || child.type === "JSXFragment",
        );

        if (hasIconChild) {
          context.report({ node, messageId: "missing" });
        }
      },
    };
  },
};
