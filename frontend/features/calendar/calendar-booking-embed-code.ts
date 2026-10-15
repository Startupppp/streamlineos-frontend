function scriptString(value: string): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

export function calendarBookingEmbedCode(href: string): string {
  const origin = new URL(href).origin;
  return [
    `<iframe title="Book a time" loading="lazy" width="100%" height="720"></iframe>`,
    "<script>",
    "(() => {",
    "  const frame = document.currentScript?.previousElementSibling;",
    "  if (!frame || frame.tagName !== 'IFRAME') return;",
    "  const state = crypto.randomUUID();",
    `  const url = new URL(${scriptString(href)});`,
    "  url.searchParams.set('state', state);",
    "  frame.src = url.toString();",
    "  window.addEventListener('message', (event) => {",
    `    if (event.origin !== ${scriptString(origin)} || event.source !== frame.contentWindow || event.data?.type !== 'streamline.calendar.booking.completed' || event.data?.state !== state) return;`,
    "    window.dispatchEvent(new CustomEvent('streamline:booking:completed', { detail: event.data.facts }));",
    "  });",
    "})();",
    "</script>",
  ].join("\n");
}
