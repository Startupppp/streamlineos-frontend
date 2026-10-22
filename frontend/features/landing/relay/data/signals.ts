
export type SignalsLoad = readonly [
  r: number,
  g: number,
  b: number,
  alphaFrom: number,
  alphaTo: number,
];

export const signalsMock = {
  head: {
    badge: "daily view",
    title: { before: "A ", accent: "Tuesday", after: ", seen from StreamlineOS." },
    aside:
      "The screen people actually keep open: what ran, what is queued, and who still owes an answer, across every module.",
  },
  week: {
    title: "this week, workflow by workflow",
    nextRun: "next run in 12 min",
    nextRunNarrow: "next in 12 min",
    hours: ["09", "11", "13", "15"],
    activeHour: "13",
    today: "tue",
    todayPeak: 4,
    days: [
      {
        label: "mon",
        loads: [
          [62, 65, 69, 0.52, 0.22],
          [73, 77, 82, 0.6, 0.25],
          [82, 86, 91, 0.66, 0.28],
          [89, 94, 99, 0.71, 0.3],
          [86, 91, 96, 0.69, 0.29],
          [77, 81, 86, 0.63, 0.26],
          [67, 71, 75, 0.56, 0.24],
          [58, 61, 65, 0.5, 0.21],
        ],
      },
      {
        label: "tue",
        loads: [
          [66, 69, 73, 0.55, 0.23],
          [77, 81, 86, 0.63, 0.26],
          [88, 93, 98, 0.7, 0.29],
          [97, 102, 107, 0.76, 0.32],
          [0, 0, 0, 0, 0],
          [89, 94, 99, 0.71, 0.3],
          [73, 77, 82, 0.6, 0.25],
          [62, 65, 69, 0.52, 0.22],
        ],
      },
      {
        label: "wed",
        loads: [
          [60, 63, 67, 0.51, 0.21],
          [72, 75, 80, 0.59, 0.25],
          [80, 85, 90, 0.65, 0.27],
          [88, 93, 98, 0.7, 0.29],
          [85, 89, 94, 0.68, 0.29],
          [74, 79, 83, 0.61, 0.26],
          [64, 68, 72, 0.54, 0.23],
          [57, 60, 64, 0.49, 0.21],
        ],
      },
      {
        label: "thu",
        loads: [
          [64, 68, 72, 0.54, 0.23],
          [74, 79, 83, 0.61, 0.26],
          [85, 89, 94, 0.68, 0.29],
          [94, 99, 104, 0.74, 0.31],
          [88, 93, 98, 0.7, 0.29],
          [79, 83, 88, 0.64, 0.27],
          [69, 72, 77, 0.57, 0.24],
          [58, 61, 65, 0.5, 0.21],
        ],
      },
      {
        label: "fri",
        loads: [
          [58, 61, 65, 0.5, 0.21],
          [69, 73, 77, 0.57, 0.24],
          [79, 83, 88, 0.64, 0.27],
          [86, 91, 96, 0.69, 0.29],
          [80, 85, 90, 0.65, 0.27],
          [72, 75, 80, 0.59, 0.25],
          [62, 65, 69, 0.52, 0.22],
          [55, 58, 61, 0.47, 0.2],
        ],
      },
      {
        label: "sat",
        loads: [
          [45, 47, 51, 0.41, 0.17],
          [48, 50, 54, 0.43, 0.18],
          [51, 54, 57, 0.45, 0.19],
          [52, 55, 59, 0.46, 0.19],
          [51, 54, 57, 0.45, 0.19],
          [48, 50, 54, 0.43, 0.18],
          [45, 47, 51, 0.41, 0.17],
          [43, 46, 49, 0.4, 0.17],
        ],
      },
      {
        label: "sun",
        loads: [
          [43, 46, 49, 0.4, 0.17],
          [46, 48, 52, 0.41, 0.17],
          [49, 51, 55, 0.44, 0.18],
          [51, 54, 57, 0.45, 0.19],
          [49, 52, 56, 0.44, 0.18],
          [47, 50, 53, 0.43, 0.18],
          [44, 47, 50, 0.41, 0.17],
          [42, 44, 47, 0.39, 0.16],
        ],
      },
    ],
  },
  handsOff: {
    title: "run success",
    value: "94%",
    caption: "of 482 workflow runs this week finished clean",
  },
  waiting: {
    title: "waiting on people",
    faces: [
      "/landing/relay/signals/signals-face-1.png",
      "/landing/relay/signals/signals-face-2.png",
      "/landing/relay/signals/signals-face-3.png",
      "/landing/relay/signals/signals-face-4.png",
      "/landing/relay/signals/signals-face-5.png",
    ],
    count: "9",
    countLabel: "approvals",
    note: "Longest wait: 26 minutes, a ₹10L+ deal",
  },
  failures: {
    title: "failures and recoveries",
    chartLabel: "Recovered and failed workflow runs crossing over the week",
    legend: { recovered: "recovered", failed: "failed hard" },
  },
  regions: {
    title: "where it happened",
    mapLabel: "Dot field lit by module: crm, hrms and inventory",
    markers: [
      { id: "iad", label: "crm" },
      { id: "fra", label: "hrms" },
      { id: "syd", label: "inventory" },
    ],
    caption: "Every module feeds the same organisation record",
  },
} as const;

export type SignalsContent = typeof signalsMock;
