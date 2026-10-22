export const integrationsMock = {
  caption: "connects to the tools you keep, and to your own via the API",
  captionLines390: [
    "connects to the tools you keep,",
    "and to your own via the API",
  ],
  apps: [
    { name: "razorpay", initials: "RZ", active: false, in1024: true, in390: true },
    { name: "stripe", initials: "ST", active: true, in1024: true, in390: true },
    {
      name: "gmail",
      initials: "GM",
      active: false,
      in1024: true,
      in390: true,
    },
    {
      name: "slack",
      initials: "SL",
      active: false,
      in1024: true,
      in390: false,
    },
    {
      name: "github",
      initials: "GH",
      active: false,
      in1024: false,
      in390: true,
    },
    {
      name: "outlook",
      initials: "OL",
      active: false,
      in1024: false,
      in390: false,
    },
    {
      name: "webhooks",
      initials: "WH",
      active: false,
      in1024: true,
      in390: false,
    },
    {
      name: "4 more",
      initials: "+",
      active: false,
      in1024: true,
      in390: false,
    },
  ],
} as const;

export type IntegrationsContent = typeof integrationsMock;
export type IntegrationsApp = IntegrationsContent["apps"][number];
