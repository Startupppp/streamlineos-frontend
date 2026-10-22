export const VALID_ROLES = new Set(
  (
    "alert alertdialog application article associationlist associationlistitemkey " +
    "associationlistitemvalue banner blockquote button caption cell checkbox code " +
    "columnheader combobox comment complementary contentinfo definition deletion " +
    "dialog directory document emphasis feed figure form generic grid gridcell " +
    "group heading img insertion link list listbox listitem log main mark marquee " +
    "math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation " +
    "none note option paragraph presentation progressbar radio radiogroup region " +
    "row rowgroup rowheader scrollbar search searchbox separator slider spinbutton " +
    "status strong subscript suggestion superscript switch tab table tablist " +
    "tabpanel term textbox time timer toolbar tooltip tree treegrid treeitem"
  ).split(/\s+/),
);

export const VALID_ARIA_ATTRIBUTES = new Set(
  (
    "aria-activedescendant aria-atomic aria-autocomplete aria-braillelabel " +
    "aria-brailleroledescription aria-busy aria-checked aria-colcount aria-colindex " +
    "aria-colindextext aria-colspan aria-controls aria-current aria-describedby " +
    "aria-description aria-details aria-disabled aria-errormessage aria-expanded " +
    "aria-flowto aria-haspopup aria-hidden aria-invalid aria-keyshortcuts aria-label " +
    "aria-labelledby aria-level aria-live aria-modal aria-multiline aria-multiselectable " +
    "aria-orientation aria-owns aria-placeholder aria-posinset aria-pressed aria-readonly " +
    "aria-relevant aria-required aria-roledescription aria-rowcount aria-rowindex " +
    "aria-rowindextext aria-rowspan aria-selected aria-setsize aria-sort aria-valuemax " +
    "aria-valuemin aria-valuenow aria-valuetext"
  ).split(/\s+/),
);

export const IMPLICIT_ROLE: Record<string, string> = {
  a: "link",
  article: "article",
  aside: "complementary",
  button: "button",
  dialog: "dialog",
  fieldset: "group",
  footer: "contentinfo",
  form: "form",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  header: "banner",
  hr: "separator",
  img: "img",
  li: "listitem",
  main: "main",
  nav: "navigation",
  ol: "list",
  optgroup: "group",
  option: "option",
  output: "status",
  p: "paragraph",
  progress: "progressbar",
  section: "region",
  select: "listbox",
  table: "table",
  tbody: "rowgroup",
  td: "cell",
  textarea: "textbox",
  tfoot: "rowgroup",
  th: "columnheader",
  thead: "rowgroup",
  tr: "row",
  ul: "list",
};

export const NATIVE_FOCUSABLE = new Set([
  "a",
  "button",
  "input",
  "select",
  "summary",
  "textarea",
]);

export const NAMED_CONTROLS = new Set(["input", "select", "textarea"]);

export const UNNAMEABLE_INPUT_TYPES = new Set([
  "button",
  "hidden",
  "image",
  "reset",
  "submit",
]);

export const REFERENCE_ATTRIBUTES = [
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
] as const;
