import { mergeAttributes, Node } from "@tiptap/core";

export type CalloutColor = "default" | "info" | "warning" | "success" | "danger";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      insertCallout: (attrs?: { emoji?: string; color?: CalloutColor }) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      emoji: {
        default: "💡",
        parseHTML: (element) => element.getAttribute("data-emoji") ?? "💡",
        renderHTML: (attributes) => ({ "data-emoji": attributes["emoji"] as string }),
      },
      color: {
        default: "default" as CalloutColor,
        parseHTML: (element) =>
          (element.getAttribute("data-color") ?? "default") as CalloutColor,
        renderHTML: (attributes) => ({
          "data-color": attributes["color"] as string,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes({ "data-type": "callout", class: "callout" }, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      insertCallout:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
            content: [{ type: "paragraph" }],
          }),
    };
  },
});
