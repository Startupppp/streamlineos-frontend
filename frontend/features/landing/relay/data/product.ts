/** 04 Product — Figma 3488:21990. StreamlineOS Workflows copy; card figures are mock UI. */
export const productMock = {
  head: {
    badge: "workflows",
    title: { before: "Most of a process is ", accent: "waiting", after: "." },
    aside:
      "Copy this into that. Check it went through. Ask finance if it is fine. StreamlineOS runs the steps between modules and leaves you the decisions.",
  },
  trace: {
    index: "01",
    title: "One canvas, every branch",
    body: "Drop a trigger, add a condition, route it to an approval, then act. Every step of every run is on the record.",
    run: "run 41982",
    summary: "finished in 129 ms",
    steps: [
      { label: "read deal", value: "120 ms", done: true },
      { label: "check value", value: "8 ms", done: true },
      { label: "branch, over ₹10L", value: "1 ms", done: true },
      { label: "ask finance", value: "waiting", done: false },
    ],
    axis: ["0", "50", "100", "150", "200 ms"],
  },
  approval: {
    index: "02",
    title: "One Approval Center",
    body: "A ₹10L+ deal, a leave request, a pay run. Whatever still needs a human lands in one queue. Approve or hold, and the workflow moves on.",
    channel: "Approval Center",
    day: "today",
    sender: "StreamlineOS",
    time: "9:41",
    message: "Deal DL-2041 is ₹12.4L, over your ₹10L limit. Approve it?",
    fields: [
      { key: "amount", value: "₹12.4L" },
      { key: "stage", value: "won, needs sign-off" },
      { key: "rule", value: "over ₹10L needs a human" },
    ],
    approve: "Approve",
    hold: "Hold",
    waiting: "waiting 26 min",
  },
  chart: {
    index: "03",
    title: "Every run is on the record",
    body: "Inputs, outputs and timings in a full audit log. Money and stock movements are ledgered, never overwritten.",
    caption: "runs per weekday",
    average: "482 runs, 94% ok",
    days: ["mon", "tue", "wed", "thu", "fri", "sat"],
  },
} as const;

export type ProductContent = typeof productMock;
