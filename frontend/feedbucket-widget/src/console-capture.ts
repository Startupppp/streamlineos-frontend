export type LogLevel = "log" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  ts: number;
}

const MAX_ENTRIES = 50;
const buffer: LogEntry[] = [];

function formatArgs(args: unknown[]): string {
  return args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ");
}

function push(level: LogLevel, args: unknown[]): void {
  if (buffer.length >= MAX_ENTRIES) {
    buffer.shift();
  }
  buffer.push({ level, message: formatArgs(args), ts: Date.now() });
}

export function initConsoleCapture(): void {
  const origLog = console.log.bind(console);
  const origInfo = console.info.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.log = (...args: unknown[]): void => {
    push("log", args);
    origLog(...args);
  };
  console.info = (...args: unknown[]): void => {
    push("info", args);
    origInfo(...args);
  };
  console.warn = (...args: unknown[]): void => {
    push("warn", args);
    origWarn(...args);
  };
  console.error = (...args: unknown[]): void => {
    push("error", args);
    origError(...args);
  };
}

export function getConsoleBuffer(): LogEntry[] {
  return buffer.slice();
}
