import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Mention } from "@tiptap/extension-mention";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { createLowlight, common } from "lowlight";
import { Callout } from "./extensions/callout";
import { SlashCommand } from "./slash-command";
import { buildMentionRender } from "./mention-suggestion";

const lowlight = createLowlight(common);

interface DocumentExtensionOptions {
  placeholder?: string;
  fetchMentionUsers?: (query: string) => Promise<Array<{ id: string; label: string }>>;
  fetchPageLinks?: (query: string) => Promise<Array<{ id: number; label: string }>>;
}

export function buildDocumentExtensions(opts: DocumentExtensionOptions) {
  const { placeholder, fetchMentionUsers, fetchPageLinks } = opts;

  const UserMention = Mention.configure({
    HTMLAttributes: { class: "mention-chip mention-chip-user" },
    renderText: ({ node }) => `@${String(node.attrs["label"] ?? node.attrs["id"] ?? "")}`,
    suggestion: {
      char: "@",
      items: async ({ query }) => {
        if (!fetchMentionUsers) return [];
        return fetchMentionUsers(query);
      },
      render: buildMentionRender(),
    },
  });

  const PageLink = Mention.extend({ name: "pageLink" }).configure({
    HTMLAttributes: { class: "mention-chip mention-chip-page" },
    renderText: ({ node }) => `[[${String(node.attrs["label"] ?? node.attrs["id"] ?? "")}]]`,
    suggestion: {
      char: "[[",
      items: async ({ query }) => {
        if (!fetchPageLinks) return [];
        const pages = await fetchPageLinks(query);
        return pages.map((p) => ({ id: String(p.id), label: p.label }));
      },
      render: buildMentionRender(),
    },
  });

  return [
    StarterKit.configure({
      codeBlock: false,
    }),
    Placeholder.configure({ placeholder: placeholder ?? "Type '/' for commands…" }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Underline,
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({
      table: { resizable: false },
    }),
    Image.configure({ inline: false }),
    CodeBlockLowlight.configure({ lowlight }),
    UserMention,
    PageLink,
    SlashCommand,
    Callout,
    Details.configure({ persist: false, openClassName: "is-open" }),
    DetailsContent,
    DetailsSummary,
  ];
}
