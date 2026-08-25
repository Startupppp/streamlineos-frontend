/**
 * Six recipients on one envelope, so the colour is the only thing telling
 * signer 1's fields from signer 6's on the page.
 *
 * All four roles of a row read one hue. They used to split — a categorical
 * `solid` over a `status-*` bg, border and text — which left recipients 1
 * and 6 identical everywhere except the swatch.
 */
const PALETTE = [
  { bg: "bg-category-sky-surface", border: "border-category-sky-rule", text: "text-category-sky-ink", solid: "bg-category-sky-fill" },
  { bg: "bg-category-emerald-surface", border: "border-category-emerald-rule", text: "text-category-emerald-ink", solid: "bg-category-emerald-fill" },
  { bg: "bg-category-amber-surface", border: "border-category-amber-rule", text: "text-category-amber-ink", solid: "bg-category-amber-fill" },
  { bg: "bg-category-violet-surface", border: "border-category-violet-rule", text: "text-category-violet-ink", solid: "bg-category-violet-fill" },
  { bg: "bg-category-rose-surface", border: "border-category-rose-rule", text: "text-category-rose-ink", solid: "bg-category-rose-fill" },
  { bg: "bg-category-cyan-surface", border: "border-category-cyan-rule", text: "text-category-cyan-ink", solid: "bg-category-cyan-fill" },
];

export function recipientColor(index: number) {
  return PALETTE[index % PALETTE.length];
}
