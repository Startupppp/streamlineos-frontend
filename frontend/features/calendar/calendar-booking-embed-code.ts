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
    "  let completed = false;",
    "  const onMessage = (event) => {",
    `    if (completed || event.origin !== ${scriptString(origin)} || event.source !== frame.contentWindow || event.data?.type !== 'streamline.calendar.booking.completed' || event.data?.state !== state) return;`,
    "    const facts = event.data.facts;",
    "    if (!facts || typeof facts !== 'object' || Array.isArray(facts)) return;",
    "    const keys = Object.keys(facts);",
    "    if (!keys.length || keys.some((key) => !['outcome', 'bookingId', 'start', 'end'].includes(key))) return;",
    "    if ('outcome' in facts && !['confirmed', 'pending'].includes(facts.outcome)) return;",
    "    if (['bookingId', 'start', 'end'].some((key) => key in facts && typeof facts[key] !== 'string')) return;",
    "    completed = true;",
    "    window.removeEventListener('message', onMessage);",
    "    window.dispatchEvent(new CustomEvent('streamline:booking:completed', { detail: facts }));",
    "  };",
    "  window.addEventListener('message', onMessage);",
    "})();",
    "</script>",
  ].join("\n");
}
