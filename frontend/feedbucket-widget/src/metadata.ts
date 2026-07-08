export interface Metadata {
  browser: string;
  browserVersion: string;
  os: string;
  device: string;
  screenW: number;
  screenH: number;
  viewportW: number;
  viewportH: number;
  userAgent: string;
  language: string;
  referrer: string;
}

interface BrowserMatch {
  name: string;
  re: RegExp;
}

const BROWSER_MATCHERS: ReadonlyArray<BrowserMatch> = [
  { name: "Edge", re: /Edg\/(\d+)/ },
  { name: "Opera", re: /OPR\/(\d+)/ },
  { name: "Chrome", re: /Chrome\/(\d+)/ },
  { name: "Firefox", re: /Firefox\/(\d+)/ },
  { name: "Safari", re: /Version\/(\d+).*Safari/ },
];

function detectBrowser(ua: string): { browser: string; browserVersion: string } {
  for (const { name, re } of BROWSER_MATCHERS) {
    const m = ua.match(re);
    if (m) return { browser: name, browserVersion: m[1] ?? "" };
  }
  return { browser: "Unknown", browserVersion: "" };
}

function detectOs(ua: string): string {
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown";
}

function detectDevice(ua: string): string {
  if (/Mobi|Android(?!.*Tablet)|iPhone/.test(ua)) return "Mobile";
  if (/iPad|Android.*Tablet/.test(ua)) return "Tablet";
  return "Desktop";
}

export function collectMetadata(): Metadata {
  const ua = navigator.userAgent;
  const { browser, browserVersion } = detectBrowser(ua);
  return {
    browser,
    browserVersion,
    os: detectOs(ua),
    device: detectDevice(ua),
    screenW: screen.width,
    screenH: screen.height,
    viewportW: window.innerWidth,
    viewportH: window.innerHeight,
    userAgent: ua,
    language: navigator.language,
    referrer: document.referrer,
  };
}

export function getPageUrl(): string {
  return location.href;
}
