import { ParagraphPlugin, createPlatePlugin } from "platejs/react";
import {
  H1Plugin,
  H2Plugin,
  H3Plugin,
  BlockquotePlugin,
  HorizontalRulePlugin,
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
} from "@platejs/basic-nodes/react";
import {
  HeadingRules,
  BlockquoteRules,
  HorizontalRuleRules,
  BoldRules,
  ItalicRules,
  StrikethroughRules,
  CodeRules,
} from "@platejs/basic-nodes";
import {
  FontColorPlugin,
  FontBackgroundColorPlugin,
  FontSizePlugin,
  TextAlignPlugin,
} from "@platejs/basic-styles/react";
import { ListPlugin } from "@platejs/list/react";
import {
  BulletedListRules,
  OrderedListRules,
  TaskListRules,
} from "@platejs/list";
import { IndentPlugin } from "@platejs/indent/react";
import {
  CodeBlockPlugin,
  CodeLinePlugin,
  CodeSyntaxPlugin,
} from "@platejs/code-block/react";
import { CodeBlockRules } from "@platejs/code-block";
import {
  ImagePlugin,
  VideoPlugin,
  AudioPlugin,
  FilePlugin,
  PlaceholderPlugin,
} from "@platejs/media/react";
import type { UploadConfig } from "@platejs/media/react";
import { LinkPlugin } from "@platejs/link/react";
import {
  TablePlugin,
  TableRowPlugin,
  TableCellPlugin,
  TableCellHeaderPlugin,
} from "@platejs/table/react";
import { CalloutPlugin } from "@platejs/callout/react";
import { TogglePlugin } from "@platejs/toggle/react";
import { MentionPlugin, MentionInputPlugin } from "@platejs/mention/react";
import { SlashPlugin, SlashInputPlugin } from "@platejs/slash-command/react";
import { CaptionPlugin } from "@platejs/caption/react";
import { EmojiPlugin, EmojiInputPlugin } from "@platejs/emoji/react";
import emojiData from "@emoji-mart/data";
import type { EmojiMartData } from "@emoji-mart/data";
import { createLowlight, common } from "lowlight";

import {
  ParagraphElement,
  HeadingElement,
  BlockquoteElement,
  HrElement,
  CodeBlockElement,
  CodeLineElement,
  CodeSyntaxLeaf,
  TableElement,
  TableRowElement,
  TableCellElement,
  TableCellHeaderElement,
  LinkElement,
  CalloutElement,
  ToggleElement,
  MentionElement,
  PageLinkElement,
} from "./plate-elements";
import {
  BoldLeaf,
  ItalicLeaf,
  UnderlineLeaf,
  StrikethroughLeaf,
  CodeLeaf,
} from "./plate-leaves";
import {
  MentionInputElement,
  SlashInputElement,
  EmojiInputElement,
} from "./plate-combobox-elements";
import {
  ImageElementWithCaption,
  VideoElement,
  AudioElement,
  FileElement,
  PlaceholderElement,
} from "./plate-media-elements";
import { LinkFloatingToolbar } from "./toolbar/link-floating-toolbar";

const lowlight = createLowlight(common);

export const UPLOAD_CONFIG: UploadConfig = {
  image: { mediaType: "img", maxFileCount: 1, maxFileSize: "8MB" },
  video: { mediaType: "video", maxFileCount: 1, maxFileSize: "64MB" },
  audio: { mediaType: "audio", maxFileCount: 1, maxFileSize: "16MB" },
  pdf: { mediaType: "file", maxFileCount: 1, maxFileSize: "16MB" },
  text: { mediaType: "file", maxFileCount: 1, maxFileSize: "16MB" },
  blob: { mediaType: "file", maxFileCount: 1, maxFileSize: "16MB" },
};

export const MAX_FILES_PER_DROP = 5;

export function buildPlugins() {
  return [
    ParagraphPlugin.withComponent(ParagraphElement),
    H1Plugin.configure({ inputRules: [HeadingRules.markdown()] }).withComponent(
      HeadingElement,
    ),
    H2Plugin.configure({ inputRules: [HeadingRules.markdown()] }).withComponent(
      HeadingElement,
    ),
    H3Plugin.configure({ inputRules: [HeadingRules.markdown()] }).withComponent(
      HeadingElement,
    ),
    BlockquotePlugin.configure({
      inputRules: [BlockquoteRules.markdown()],
    }).withComponent(BlockquoteElement),
    HorizontalRulePlugin.configure({
      inputRules: [HorizontalRuleRules.markdown({ variant: "-" })],
    }).withComponent(HrElement),
    BoldPlugin.configure({
      inputRules: [BoldRules.markdown({ variant: "*" })],
    }).withComponent(BoldLeaf),
    ItalicPlugin.configure({
      inputRules: [ItalicRules.markdown({ variant: "*" })],
    }).withComponent(ItalicLeaf),
    UnderlinePlugin.withComponent(UnderlineLeaf),
    StrikethroughPlugin.configure({
      inputRules: [StrikethroughRules.markdown()],
    }).withComponent(StrikethroughLeaf),
    CodePlugin.configure({ inputRules: [CodeRules.markdown()] }).withComponent(
      CodeLeaf,
    ),
    FontColorPlugin,
    FontBackgroundColorPlugin,
    FontSizePlugin,
    TextAlignPlugin.configure({
      inject: {
        targetPlugins: [
          ParagraphPlugin.key,
          H1Plugin.key,
          H2Plugin.key,
          H3Plugin.key,
        ],
      },
    }),
    IndentPlugin.configure({
      inject: {
        targetPlugins: [
          ParagraphPlugin.key,
          H1Plugin.key,
          H2Plugin.key,
          H3Plugin.key,
        ],
      },
    }),
    ListPlugin.configure({
      inputRules: [
        BulletedListRules.markdown({ variant: "-" }),
        OrderedListRules.markdown({ variant: "." }),
        TaskListRules.markdown({ checked: false }),
      ],
    }),
    CodeBlockPlugin.configure({
      options: { lowlight },
      inputRules: [CodeBlockRules.markdown({ on: "match" })],
    }).withComponent(CodeBlockElement),
    CodeLinePlugin.withComponent(CodeLineElement),
    CodeSyntaxPlugin.withComponent(CodeSyntaxLeaf),
    CaptionPlugin.configure({
      options: { query: { allow: ["img", "video"] } },
    }),
    ImagePlugin.withComponent(ImageElementWithCaption),
    VideoPlugin.withComponent(VideoElement),
    AudioPlugin.withComponent(AudioElement),
    FilePlugin.withComponent(FileElement),
    PlaceholderPlugin.configure({
      options: {
        uploadConfig: UPLOAD_CONFIG,
        disableEmptyPlaceholder: true,
        disableFileDrop: true,
      },
    }).withComponent(PlaceholderElement),
    LinkPlugin.configure({
      render: { afterEditable: LinkFloatingToolbar },
    }).withComponent(LinkElement),
    TablePlugin.withComponent(TableElement),
    TableRowPlugin.withComponent(TableRowElement),
    TableCellPlugin.withComponent(TableCellElement),
    TableCellHeaderPlugin.withComponent(TableCellHeaderElement),
    CalloutPlugin.withComponent(CalloutElement),
    TogglePlugin.withComponent(ToggleElement),
    MentionPlugin.configure({
      options: { trigger: "@", triggerPreviousCharPattern: /^\s?$/ },
    }).withComponent(MentionElement),
    MentionInputPlugin.withComponent(MentionInputElement),
    EmojiPlugin.configure({
      options: { data: emojiData as EmojiMartData },
    }),
    EmojiInputPlugin.withComponent(EmojiInputElement),
    createPlatePlugin({
      key: "page_link",
      node: { isElement: true, isInline: true, isVoid: true },
    }).withComponent(PageLinkElement),
    SlashPlugin.configure({
      options: { trigger: "/", triggerPreviousCharPattern: /^\s?$/ },
    }),
    SlashInputPlugin.withComponent(SlashInputElement),
  ];
}
