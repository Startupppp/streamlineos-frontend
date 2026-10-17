/**
 * Flags a <button>, <Button> or <AnimatedIconButton> element that contains only
 * *Icon-named components and carries none of the standard accessible-name
 * attributes.
 *
 * AnimatedIconButton's discriminated union enforces an accessible name at the
 * type level, but that guard is invisible when someone writes a raw <button>
 * or a plain shadcn <Button> — the type erases and a screen reader hears
 * nothing but "button". The union is also satisfied by `children`, which is why
 * AnimatedIconButton is checked here too: children hidden at the base
 * breakpoint pass the type and still announce nothing.
 *
 * A `<Button asChild>` is read through to its single element child, since
 * asChild merges the Button's props into that child and the accessible name
 * belongs on whichever of the two carries it.
 *
 * Conservative by design — the rule skips four patterns it cannot resolve
 * statically:
 *
 *   1. expression-container children ({label}, {t("x")}) — may render text
 *   2. props/rest spreads ({...props}, {...rest}) — caller supplies aria-label
 *   3. lowercase HTML-element children (<span>, <div>) — may contain text,
 *      EXCEPT one whose className carries an unprefixed `hidden`. A
 *      `<span className="hidden sm:inline">Label</span>` is display:none at the
 *      base breakpoint, so it is evidence of NO accessible name on a phone
 *      rather than evidence of one, and it no longer suppresses the report when
 *      every remaining child is an icon.
 *   4. PascalCase non-icon children (name does not end in "Icon") — may render
 *      text or complex UI (e.g. <TruncatedText>, <Avatar>)
 *
 * Two cases are flagged: every JSX child's name ends in "Icon" and no static
 * evidence of a visible label exists; or the only text-bearing child is hidden
 * at the base breakpoint and everything beside it is an icon. "Icon" means a
 * name ending in "Icon" or a component imported from a lucide module, because
 * lucide's own exports (<Plus>, <Upload>) carry no suffix.
 *
 * Escape hatch for confirmed false positives:
 *   // eslint-disable-next-line streamline/no-unlabelled-icon-button -- <reason>
 */

const CHECKED_ELEMENTS = new Set(["button", "Button", "AnimatedIconButton"]);

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Every icon-only <button> or <Button> must carry aria-label, aria-labelledby, or title so screen readers can announce its purpose.",
    },
    schema: [],
    messages: {
      missing:
        "This icon-only button has no accessible name. Add aria-label=\"…\", aria-labelledby, or title. If it already carries visible text, the rule is a false positive — suppress with // eslint-disable-next-line streamline/no-unlabelled-icon-button and a brief justification.",
      hiddenLabel:
        "This button's only label is a child hidden at the base breakpoint ({{className}}), so it has no accessible name on a phone — assistive tech announces \"button\". Add aria-label=\"…\" (on the <Link> when the button is asChild), or pair the hidden span with a visible short form.",
    },
  },

  create(context) {
    const iconImports = new Set();

    function isIconElement(child) {
      if (child.type !== "JSXElement") return false;
      const childName = child.openingElement?.name;
      if (childName?.type !== "JSXIdentifier") return false;
      return /Icon$/.test(childName.name) || iconImports.has(childName.name);
    }

    function hiddenAtBaseClassName(child) {
      if (child.type !== "JSXElement") return null;
      const childName = child.openingElement?.name;
      if (childName?.type !== "JSXIdentifier") return null;
      if (!/^[a-z]/.test(childName.name)) return null;
      for (const attr of child.openingElement.attributes) {
        if (attr.type !== "JSXAttribute") continue;
        if (attr.name.type !== "JSXIdentifier") continue;
        if (attr.name.name !== "className") continue;
        const value = attr.value;
        const text =
          value?.type === "Literal" && typeof value.value === "string"
            ? value.value
            : value?.type === "JSXExpressionContainer" &&
                value.expression.type === "Literal" &&
                typeof value.expression.value === "string"
              ? value.expression.value
              : null;
        if (text === null) continue;
        if (text.split(/\s+/).includes("hidden")) return text;
      }
      return null;
    }

    return {
      ImportDeclaration(node) {
        if (!/lucide/.test(node.source.value)) return;
        for (const spec of node.specifiers) {
          if (spec.local?.type === "Identifier") iconImports.add(spec.local.name);
        }
      },

      JSXOpeningElement(node) {
        if (
          node.name.type !== "JSXIdentifier" ||
          !CHECKED_ELEMENTS.has(node.name.name)
        )
          return;

        let attributes = node.attributes;
        let children = node.parent.children ?? [];
        let reportNode = node;

        const isAsChild = attributes.some(
          (attr) =>
            attr.type === "JSXAttribute" &&
            attr.name.type === "JSXIdentifier" &&
            attr.name.name === "asChild",
        );

        if (isAsChild) {
          const substantive = children.filter(
            (child) => !(child.type === "JSXText" && child.value.trim() === ""),
          );
          if (substantive.length !== 1 || substantive[0].type !== "JSXElement")
            return;
          const inner = substantive[0];
          attributes = [...attributes, ...inner.openingElement.attributes];
          children = inner.children ?? [];
          reportNode = inner.openingElement;
        }

        const hasAccessibleName = attributes.some((attr) => {
          if (attr.type !== "JSXAttribute") return false;
          if (attr.name.type !== "JSXIdentifier") return false;
          return (
            attr.name.name === "aria-label" ||
            attr.name.name === "aria-labelledby" ||
            attr.name.name === "title"
          );
        });

        if (hasAccessibleName) return;

        const hasPropsSpread = attributes.some(
          (attr) =>
            attr.type === "JSXSpreadAttribute" &&
            attr.argument.type === "Identifier" &&
            /^(props|rest|[a-zA-Z]*[Pp]rops|[a-zA-Z]*[Aa]ttrs?)$/.test(
              attr.argument.name,
            ),
        );

        if (hasPropsSpread) return;

        if (children.length === 0) return;

        const hiddenChildren = children.filter(
          (child) => hiddenAtBaseClassName(child) !== null,
        );

        if (hiddenChildren.length > 0) {
          const rest = children.filter(
            (child) => !hiddenChildren.includes(child),
          );
          const restIsAllIcons = rest.every((child) => {
            if (child.type === "JSXText") return child.value.trim() === "";
            return isIconElement(child);
          });
          if (restIsAllIcons) {
            context.report({
              node: reportNode,
              messageId: "hiddenLabel",
              data: { className: hiddenAtBaseClassName(hiddenChildren[0]) },
            });
            return;
          }
        }

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
          context.report({ node: reportNode, messageId: "missing" });
        }
      },
    };
  },
};
