import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  Presentation,
  PresentationFile,
} from "file:///C:/Users/Aditya_Lappy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const WORKSPACE_DIR = "D:/projects/personal/Streamlineos";
const SKILL_DIR = "C:/Users/Aditya_Lappy/.codex/plugins/cache/openai-primary-runtime/presentations/26.1015.12040/skills/presentations";
const RUNTIME_PYTHON = "C:/Users/Aditya_Lappy/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const BUILD_DIR = path.join(WORKSPACE_DIR, ".codex-build", "docs-drive-first");
const RENDER_DIR = path.join(BUILD_DIR, "rendered");
const FINAL_PPTX = path.join(
  WORKSPACE_DIR,
  "docs",
  "specs",
  "knowledge-base",
  "deliverables",
  "StreamlineOS-Drive-First-Docs-Competitor-Analysis-2026-10-20.pptx",
);

const W = 1280;
const H = 720;
const FONT = "Segoe UI";
const C = {
  ink: "#112A3A",
  body: "#334155",
  muted: "#64748B",
  paper: "#F7FAFC",
  white: "#FFFFFF",
  line: "#D9E3EA",
  teal: "#0F766E",
  tealLight: "#DFF5EF",
  navy: "#0B2535",
  mint: "#B9F3E2",
  amber: "#D97706",
  amberLight: "#FFF3D6",
  rose: "#B42318",
  roseLight: "#FDEBEA",
  blue: "#2563EB",
  blueLight: "#EAF1FF",
};

async function writeBlob(targetPath, blob) {
  await fs.writeFile(targetPath, new Uint8Array(await blob.arrayBuffer()));
}

function addText(slide, {
  name,
  text,
  left,
  top,
  width,
  height,
  size = 20,
  color = C.body,
  bold = false,
  align = "left",
  valign = "top",
  lineSpacing = 1.14,
}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name,
    position: { left, top, width, height },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    typeface: FONT,
    fontSize: size,
    color,
    bold,
    alignment: align,
    verticalAlignment: valign,
    lineSpacing,
    autoFit: "shrinkText",
    insets: 0,
  };
  return shape;
}

function addRule(slide, left, top, width, fill = C.teal, height = 5) {
  return slide.shapes.add({
    geometry: "rect",
    position: { left, top, width, height },
    fill,
    line: { style: "solid", fill: "none", width: 0 },
  });
}

function addFooter(slide, number, text = "Primary-source evidence and detailed citations appear in speaker notes") {
  addRule(slide, 72, 665, 1136, C.line, 1);
  addText(slide, {
    name: `footer-${number}`,
    text,
    left: 72,
    top: 678,
    width: 980,
    height: 22,
    size: 11,
    color: C.muted,
  });
  addText(slide, {
    name: `slide-number-${number}`,
    text: String(number).padStart(2, "0"),
    left: 1130,
    top: 675,
    width: 78,
    height: 22,
    size: 12,
    color: C.teal,
    bold: true,
    align: "right",
  });
}

function addTitle(slide, number, eyebrow, title, subtitle = "") {
  addText(slide, {
    name: `eyebrow-${number}`,
    text: eyebrow.toUpperCase(),
    left: 72,
    top: 50,
    width: 600,
    height: 22,
    size: 12,
    color: C.teal,
    bold: true,
  });
  addRule(slide, 72, 83, 96);
  addText(slide, {
    name: `title-${number}`,
    text: title,
    left: 72,
    top: 104,
    width: 1080,
    height: 66,
    size: 34,
    color: C.ink,
    bold: true,
    lineSpacing: 1,
  });
  if (subtitle) {
    addText(slide, {
      name: `subtitle-${number}`,
      text: subtitle,
      left: 72,
      top: 180,
      width: 1080,
      height: 40,
      size: 17,
      color: C.muted,
      lineSpacing: 1.1,
    });
  }
  addFooter(slide, number);
}

function addNativeTable(slide, {
  name,
  values,
  left,
  top,
  width,
  height,
  columnWidths,
  headerFill = C.navy,
  headerColor = C.white,
  bodySize = 15,
  headerSize = 14,
  rowFills = [C.white, "#F1F6F8"],
}) {
  const table = slide.tables.add({
    rows: values.length,
    columns: values[0].length,
    left,
    top,
    width,
    height,
    columnWidths,
    values,
  });
  table.borders.assign({ style: "solid", fill: C.line, width: 1 });
  table.rows[0].height = 48;
  for (let col = 0; col < values[0].length; col += 1) {
    const cell = table.getCell(0, col);
    cell.fill = headerFill;
    cell.text.style = {
      typeface: FONT,
      fontSize: headerSize,
      color: headerColor,
      bold: true,
      verticalAlignment: "middle",
      autoFit: "shrinkText",
    };
  }
  for (let row = 1; row < values.length; row += 1) {
    table.rows[row].height = (height - 48) / (values.length - 1);
    for (let col = 0; col < values[row].length; col += 1) {
      const cell = table.getCell(row, col);
      cell.fill = rowFills[(row - 1) % rowFills.length];
      cell.text.style = {
        typeface: FONT,
        fontSize: bodySize,
        color: C.body,
        verticalAlignment: "middle",
        autoFit: "shrinkText",
      };
    }
  }
  return table;
}

function notes(slide, lines) {
  slide.speakerNotes.text = lines;
  slide.speakerNotes.setVisible(true);
}

function addPageText(slide, label, heading, body, left, top, width, accent) {
  addText(slide, {
    name: `${label}-label`,
    text: label.toUpperCase(),
    left,
    top,
    width,
    height: 20,
    size: 12,
    color: accent,
    bold: true,
  });
  addText(slide, {
    name: `${label}-heading`,
    text: heading,
    left,
    top: top + 30,
    width,
    height: 58,
    size: 25,
    color: C.ink,
    bold: true,
    lineSpacing: 1,
  });
  addText(slide, {
    name: `${label}-body`,
    text: body,
    left,
    top: top + 100,
    width,
    height: 210,
    size: 17,
    color: C.body,
    lineSpacing: 1.22,
  });
}

function buildDeck() {
  const presentation = Presentation.create({ slideSize: { width: W, height: H } });

  // 1. Cover
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.navy;
    addText(slide, {
      name: "cover-kicker",
      text: "STREAMLINEOS · PRODUCT DIRECTION",
      left: 72,
      top: 76,
      width: 500,
      height: 22,
      size: 13,
      color: C.mint,
      bold: true,
    });
    addRule(slide, 72, 120, 124, C.mint, 6);
    addText(slide, {
      name: "cover-title",
      text: "Drive-first Docs",
      left: 72,
      top: 164,
      width: 880,
      height: 72,
      size: 52,
      color: C.white,
      bold: true,
      lineSpacing: 1,
    });
    addText(slide, {
      name: "cover-subtitle",
      text: "Competitor analysis and product strategy for a shared document workspace",
      left: 72,
      top: 262,
      width: 700,
      height: 74,
      size: 24,
      color: "#D8E8ED",
      lineSpacing: 1.12,
    });
    addText(slide, {
      name: "cover-decision",
      text: "Selected direction: A — files, folders, sharing, Docs, and spreadsheet readiness before more Wiki surfaces",
      left: 72,
      top: 480,
      width: 890,
      height: 58,
      size: 19,
      color: C.mint,
      bold: true,
      lineSpacing: 1.12,
    });
    addText(slide, {
      name: "cover-date",
      text: "20 October 2026",
      left: 72,
      top: 640,
      width: 320,
      height: 24,
      size: 14,
      color: "#B9CDD5",
    });
    notes(slide, [
      "Decision deck based on current StreamlineOS source audit and first-party competitor documentation.",
      "Current product authority: docs/specs/knowledge-base/2026-10-20-document-module-product-decision.md",
    ]);
  }

  // 2. Decision
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.paper;
    addTitle(
      slide,
      2,
      "Product decision",
      "Docs should become a shared document workspace",
      "Keep the knowledge-authoring strengths, but make files, folders, ownership, and sharing the primary mental model.",
    );
    addPageText(
      slide,
      "Today",
      "A Wiki with useful page features",
      "The current module starts with pages, spaces, and knowledge behavior. It already has sharing, history, comments, templates, search, and a nested page tree.",
      72,
      276,
      500,
      C.teal,
    );
    addPageText(
      slide,
      "Target",
      "A place people trust for work files",
      "The default journey starts with My files, Team folders, and Shared with me. Native Docs and Sheets live inside the same ownership, version, and permission system.",
      672,
      276,
      500,
      C.blue,
    );
    notes(slide, [
      "Current-source audit basis:",
      "- frontend/features/wiki/components/wiki-sidebar-nav.tsx",
      "- backend/src/db/schema/kb/pages.ts",
      "- backend/src/db/schema/kb/page-grants.ts",
      "- backend/src/db/schema/kb/attachments.ts",
      "The decision reflects the product direction selected by the owner: A — Drive-first Docs.",
    ]);
  }

  // 3. Competitor map
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.paper;
    addTitle(
      slide,
      3,
      "Competitor map",
      "The market separates file workspaces from knowledge workspaces",
      "The strongest products combine a durable library model with format-specific authoring rather than treating every asset as a page attachment.",
    );
    addNativeTable(slide, {
      name: "competitor-comparison",
      left: 72,
      top: 258,
      width: 1136,
      height: 340,
      columnWidths: [150, 260, 350, 376],
      values: [
        ["Competitor", "Core organizing model", "Documents and spreadsheets", "Sharing pattern"],
        ["Google", "My Drive + Shared drives", "Docs and Sheets in the browser", "Shared with me, roles, inherited folder access"],
        ["Microsoft", "OneDrive + SharePoint libraries", "Word and Excel web with desktop fallback", "Shared view, link controls, managed access"],
        ["Zoho", "My Folders + Team Folders", "Writer, Sheet, Show, Office-format handling", "Team roles, group shares, expiry controls"],
        ["Notion", "Pages + teamspaces", "Pages and databases", "Invites, groups, inherited subpages, expiring links"],
        ["Confluence", "Spaces + pages", "Pages and live docs", "Space and content restrictions, governed versions"],
      ],
      bodySize: 14,
      headerSize: 13,
    });
    notes(slide, [
      "Primary sources:",
      "Google Drive sharing: https://support.google.com/drive/answer/7166529?hl=en",
      "Google Drive Shared with me: https://support.google.com/drive/answer/2375057?co=GENIE.Platform%3DDesktop&hl=en-GB",
      "Microsoft Excel for the web: https://support.microsoft.com/en-US/Excel/basic-tasks-in-excel-for-the-web",
      "Microsoft OneDrive shared view: https://support.microsoft.com/en-gb/onedrive/see-files-you-shared-in-onedrive",
      "Zoho WorkDrive files and folders: https://help.zoho.com/portal/en/kb/workdrive/upload-and-import/articles/add-files-folders-to-my-folders-and-team-folders",
      "Notion sharing: https://www.notion.com/help/sharing-and-permissions",
      "Confluence authoring: https://support.atlassian.com/confluence-cloud/docs/create-edit-and-publish-a-page/",
    ]);
  }

  // 4. Table stakes
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.paper;
    addTitle(
      slide,
      4,
      "Customer expectation",
      "Five behaviors now define credible Docs software",
      "These are product contracts, not a collection of isolated controls.",
    );
    addNativeTable(slide, {
      name: "table-stakes",
      left: 72,
      top: 260,
      width: 1136,
      height: 330,
      columnWidths: [245, 435, 456],
      values: [
        ["Expected behavior", "What the user needs", "Implication for StreamlineOS"],
        ["Personal and team homes", "Separate personal work from organization-owned shared work", "My files and Team folders become top-level destinations"],
        ["Inbound sharing", "See who shared an item, why it is accessible, and where it lives", "Shared with me needs file/folder metadata and shortcut support"],
        ["Permission inheritance", "Folders make policy predictable; exceptions are deliberate", "Inherited ACLs must govern list, search, preview, download, and AI"],
        ["File-specific editing", "Docs and spreadsheets open in an editor suited to their format", "Define a real DOCX/XLSX preview and edit contract"],
        ["Recoverable collaboration", "Changes, comments, deletes, and restores can be traced", "Versions, activity, trash, and audit become core infrastructure"],
      ],
      bodySize: 14,
      headerSize: 13,
      headerFill: C.teal,
    });
    notes(slide, [
      "Primary sources:",
      "Google Drive sharing and inheritance: https://support.google.com/drive/answer/7166529?hl=en",
      "Google Sheets collaboration and version history: https://support.google.com/docs/answer/9331169?hl=en and https://support.google.com/docs/answer/190843?hl=en-en",
      "Microsoft SharePoint permission scopes: https://learn.microsoft.com/en-us/sharepoint/manage-permission-scope",
      "Zoho WorkDrive Team Folders: https://help.zoho.com/portal/en/kb/workdrive/frequently-asked-questions-faqs/team-folders/articles/team-folders-faqs",
    ]);
  }

  // 5. Current state
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.paper;
    addTitle(
      slide,
      5,
      "Current-state audit",
      "The foundation is valuable; the object model is the blocker",
      "The right move is a controlled extension and migration, not a blind rewrite or a superficial navigation rename.",
    );
    addPageText(
      slide,
      "Already valuable",
      "Reuse the working knowledge core",
      "Rich pages\nExplicit page grants\nShared with me\nTemplates, search, comments\nHistory, imports, exports, trash\nAttachment storage, scanning, audit",
      72,
      260,
      470,
      C.teal,
    );
    addPageText(
      slide,
      "Core gap",
      "A page tree is not a file system",
      "No first-class file or folder\nAttachments do not behave as independent library items\nXLSX can attach but is excluded from source import and text extraction\nNo chosen Office editing contract\nResearch Briefs add a separate product surface",
      668,
      260,
      470,
      C.rose,
    );
    notes(slide, [
      "Current-source evidence:",
      "- backend/src/db/schema/kb/pages.ts: parentPageId creates a page hierarchy, not a typed file/folder library.",
      "- backend/src/db/schema/kb/attachments.ts: uploaded files are page attachments.",
      "- frontend/features/wiki/lib/upload-kb-media.ts: XLS/XLSX are accepted as media attachments.",
      "- backend/src/modules/kb/wiki/kb-sources.service.ts: source uploads allow PDF, DOCX, and text types, not XLS/XLSX.",
      "- backend/src/common/documents/extract-document-text.util.ts: extraction supports PDF, DOCX, and text, not XLS/XLSX.",
      "- frontend/components/layout/sidebar/sidebar-nav-groups-knowledge-support.ts: Research Briefs has a primary Knowledge sidebar route.",
    ]);
  }

  // 6. Target information architecture
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.paper;
    addTitle(
      slide,
      6,
      "Target information architecture",
      "Everyday navigation should begin with ownership and access",
      "The module should let a user answer “where is my work?” before asking “what knowledge page should I browse?”",
    );
    addText(slide, {
      name: "primary-nav-heading",
      text: "Everyday destinations",
      left: 72,
      top: 276,
      width: 350,
      height: 32,
      size: 19,
      color: C.teal,
      bold: true,
    });
    addText(slide, {
      name: "primary-nav-list",
      text: "01  Home\n02  My files\n03  Shared with me\n04  Team folders\n05  Templates\n06  Search\n07  Trash",
      left: 72,
      top: 326,
      width: 440,
      height: 248,
      size: 23,
      color: C.ink,
      bold: true,
      lineSpacing: 1.38,
    });
    addText(slide, {
      name: "context-heading",
      text: "Contextual actions and owner-only areas",
      left: 648,
      top: 276,
      width: 500,
      height: 32,
      size: 19,
      color: C.blue,
      bold: true,
    });
    addText(slide, {
      name: "context-body",
      text: "Create Doc or Sheet\nUpload and import\nShare, request access, and manage memberships\nAsk about a selected file or folder\nOpen linked business records\nGovernance: reviews, storage, activity, and share reporting\n\nResearch Briefs leave everyday Docs navigation. Retain them only as a separately governed AI add-on if product demand proves it.",
      left: 648,
      top: 326,
      width: 500,
      height: 260,
      size: 18,
      color: C.body,
      lineSpacing: 1.22,
    });
    notes(slide, [
      "Information architecture recommendation synthesizes the Drive/OneDrive/WorkDrive patterns documented in the research report.",
      "Sources: https://support.google.com/drive/answer/2375057?co=GENIE.Platform%3DDesktop&hl=en-GB",
      "https://support.microsoft.com/en-gb/onedrive/see-files-you-shared-in-onedrive",
      "https://help.zoho.com/portal/en/kb/workdrive/upload-and-import/articles/add-files-folders-to-my-folders-and-team-folders",
    ]);
  }

  // 7. Feature tiers
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.paper;
    addTitle(
      slide,
      7,
      "Feature tiers",
      "Build the file-workspace promise before the differentiators",
      "Must features establish trust. Basic features create everyday usefulness. WOW features earn differentiation once the underlying access and version model is sound.",
    );
    addNativeTable(slide, {
      name: "feature-tiers",
      left: 72,
      top: 260,
      width: 1136,
      height: 316,
      columnWidths: [132, 290, 714],
      values: [
        ["Tier", "Purpose", "Capability set"],
        ["MUST", "A credible file workspace", "Files, folders, team folders, sharing, inherited access, versions, restore, trash, preview, search, activity, safe XLSX/CSV support"],
        ["BASIC", "Everyday collaborative work", "Native rich Docs, spreadsheet tabs/formulas/filtering, comments, mentions, presence, access requests, external sharing controls, templates"],
        ["WOW", "Measured differentiation", "Cited Ask Docs, smart filing, workflow extraction, document health, semantic collections, cross-module evidence links"],
      ],
      bodySize: 16,
      headerSize: 14,
    });
    notes(slide, [
      "Tier definitions are a StreamlineOS product recommendation based on competitor evidence, not a claim that competitors supply every item identically.",
      "Examples of baseline evidence: Google Drive sharing https://support.google.com/drive/answer/7166529?hl=en; Microsoft Excel web https://support.microsoft.com/en-US/Excel/basic-tasks-in-excel-for-the-web; Zoho WorkDrive https://help.zoho.com/portal/en/kb/workdrive/upload-and-import/articles/add-files-folders-to-my-folders-and-team-folders.",
    ]);
  }

  // 8. Spreadsheet strategy
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.paper;
    addTitle(
      slide,
      8,
      "Spreadsheet strategy",
      "Start with a real XLSX lifecycle; choose the editor deliberately",
      "Do not market Excel support until a workbook can be safely opened, shared, versioned, found, and edited through a defined contract.",
    );
    addNativeTable(slide, {
      name: "spreadsheet-strategy",
      left: 72,
      top: 260,
      width: 1136,
      height: 316,
      columnWidths: [165, 405, 566],
      values: [
        ["Phase", "What the user can do", "Technical boundary"],
        ["1. Library readiness", "Upload, create, preview, share, search, version, restore, download XLSX and CSV", "Preserve original bytes; add bounded extraction/indexing; no claim of full spreadsheet editing"],
        ["2. Chosen editor", "Open a workbook in the selected editing experience", "Integrate Microsoft 365/Google Workspace or build a bounded native grid; prove round-trip fidelity"],
        ["3. Collaboration depth", "Co-edit cells, protect ranges, comment, chart, and analyze", "Only after the editor path proves demand and access/version parity is reliable"],
      ],
      bodySize: 16,
      headerSize: 14,
      headerFill: C.teal,
    });
    notes(slide, [
      "Primary sources:",
      "Microsoft Excel for the web: https://support.microsoft.com/en-US/Excel/basic-tasks-in-excel-for-the-web",
      "Google Sheets collaboration: https://support.google.com/docs/answer/9331169?hl=en",
      "Zoho WorkDrive Office formats: https://help.zoho.com/portal/en/kb/workdrive/upload-and-import/articles/add-files-folders-to-my-folders-and-team-folders",
      "The staged strategy is a StreamlineOS recommendation based on current product gaps.",
    ]);
  }

  // 9. Architecture and safety
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.paper;
    addTitle(
      slide,
      9,
      "Architecture and safety",
      "The same access policy must govern every way content is reached",
      "File management only becomes trustworthy when permissions, storage, search, AI, and recovery all honor one lifecycle.",
    );
    addNativeTable(slide, {
      name: "architecture-principles",
      left: 72,
      top: 260,
      width: 1136,
      height: 320,
      columnWidths: [280, 856],
      values: [
        ["Principle", "Required behavior"],
        ["Typed library objects", "Model folders, files, native documents, native sheets, and shortcuts separately. Do not encode every asset as a Wiki page."],
        ["One permission engine", "Resolve inherited and explicit access consistently for browse, search, preview, download, AI, notifications, versions, and audit."],
        ["Safe file pipeline", "Validate declared type, magic bytes, size, malware state, preview eligibility, and extractability before exposing or indexing content."],
        ["Transactional moves", "Recalculate inherited access before an item becomes visible in its destination; prevent cross-workspace leakage."],
        ["Recovery by design", "Keep immutable versions, explicit trash retention, restore lineage, storage quotas, and append-only activity evidence."],
      ],
      bodySize: 15,
      headerSize: 14,
      headerFill: C.navy,
    });
    notes(slide, [
      "Primary architecture references:",
      "Microsoft SharePoint permission scopes: https://learn.microsoft.com/en-us/sharepoint/manage-permission-scope",
      "Google Drive folder inheritance: https://support.google.com/drive/answer/7166529?hl=en",
      "Notion inherited permissions: https://www.notion.com/help/sharing-and-permissions",
      "Current StreamlineOS source was reviewed for attachment validation and access primitives. This slide recommends an extension of those patterns.",
    ]);
  }

  // 10. Sequenced recommendation
  {
    const slide = presentation.slides.add();
    slide.background.fill = C.paper;
    addTitle(
      slide,
      10,
      "Recommended sequence",
      "Make the library trustworthy, then deepen authoring and intelligence",
      "This sequence protects existing content while making the highest-impact Docs behaviors visible early.",
    );
    addNativeTable(slide, {
      name: "delivery-sequence",
      left: 72,
      top: 258,
      width: 1136,
      height: 326,
      columnWidths: [145, 370, 621],
      values: [
        ["Stage", "Product outcome", "Evidence gate"],
        ["Foundation", "My files, Team folders, Shared with me, file/folder model, sharing, move, version, trash", "ACL matrix, migration/rollback plan, access tests across browse/search/download"],
        ["Office-ready", "DOCX/XLSX/CSV preview, import, storage, search, and a chosen open/edit path", "Format acceptance, parser bounds, preview safety, round-trip tests"],
        ["Collaboration", "Native Docs, comments, mentions, templates, activity, conflict recovery", "Concurrent edit, permissions, version restore, browser journeys"],
        ["Differentiation", "Cited Ask Docs, smart filing, workflow extraction, health and review cues", "Access recheck for citations, quality feedback, cost/latency controls"],
      ],
      bodySize: 15,
      headerSize: 14,
      headerFill: C.teal,
    });
    addText(slide, {
      name: "next-decision",
      text: "Spreadsheet decision: validate Microsoft 365 first; defer a native grid until measured demand justifies it.",
      left: 72,
      top: 610,
      width: 1020,
      height: 30,
      size: 17,
      color: C.ink,
      bold: true,
    });
    notes(slide, [
      "This delivery sequence is a product recommendation informed by the competitor research and current-source audit.",
      "No implementation completion, production readiness, or deletion is claimed by this deck.",
      "Detailed requirements and evidence are in docs/specs/knowledge-base/2026-10-20-document-module-product-decision.md.",
    ]);
  }

  return presentation;
}

async function main() {
  await fs.mkdir(BUILD_DIR, { recursive: true });
  await fs.mkdir(RENDER_DIR, { recursive: true });
  await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });

  const presentation = buildDeck();
  for (const [index, slide] of presentation.slides.items.entries()) {
    const png = await presentation.export({ slide, format: "png", scale: 1.5 });
    await writeBlob(path.join(RENDER_DIR, `slide-${String(index + 1).padStart(2, "0")}.png`), png);
  }
  const montage = await presentation.export({ format: "webp", montage: true, scale: 1 });
  await writeBlob(path.join(BUILD_DIR, "deck-montage.webp"), montage);

  const { finalizePresentation } = await import(pathToFileURL(
    path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs"),
  ).href);
  const candidatePath = path.join(BUILD_DIR, "candidate.pptx");
  await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

  const requirements = {
    explicitTotalSlideCount: 10,
    requiredNativeTableOwnerSlides: [3, 4, 7, 8, 9, 10],
    requiredNativeChartOwnerSlides: [],
    materializeLiteralChartWorkbooks: false,
  };
  const fontPolicy = { basis: "design", families: [FONT] };
  const finalizerResult = await finalizePresentation({
    ...requirements,
    workspaceDir: WORKSPACE_DIR,
    candidatePath,
    finalPath: FINAL_PPTX,
    pythonExecutable: RUNTIME_PYTHON,
    integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
    layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
    layoutArgs: [
      "--expected-slide-size-emu",
      "12192000,6858000",
      "--validate-bullet-geometry",
      "--validate-heading-fit",
      "--require-native-table-slide", "3",
      "--require-native-table-slide", "4",
      "--require-native-table-slide", "7",
      "--require-native-table-slide", "8",
      "--require-native-table-slide", "9",
      "--require-native-table-slide", "10",
    ],
    requiredNativeTableOwnerSlides: requirements.requiredNativeTableOwnerSlides,
    fontPolicy,
    verifyArtifactToolImport: true,
    receiptPath: path.join(BUILD_DIR, "validation.json"),
  });
  console.log(JSON.stringify({ finalPath: FINAL_PPTX, finalizerResult }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
