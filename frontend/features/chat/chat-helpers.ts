import { format, isToday, isYesterday } from "date-fns";

export function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function toDate(date: Date | string | null): Date | null {
  if (!date) return null;
  if (date instanceof Date) return date;

  if (typeof date === "string" && !date.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(date) && !date.includes("T")) {
    return new Date(date.replace(" ", "T") + "Z");
  }
  return new Date(date);
}

export function formatMessageTime(date: Date | string | null) {
  const d = toDate(date);
  if (!d) return "";
  return format(d, "h:mm a");
}

export function formatMessageTimeFull(date: Date | string | null) {
  const d = toDate(date);
  if (!d) return "";
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy") + " at " + format(d, "h:mm a");
}

export function formatChannelTime(date: Date | string | null) {
  const d = toDate(date);
  if (!d) return "";
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getFileExt(name: string) {
  return name.split(".").pop()?.toUpperCase() || "FILE";
}

export function getFileColor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return { bg: "bg-red-500/10", text: "text-red-600", badge: "bg-red-500" };
    case "doc": case "docx": return { bg: "bg-blue-500/10", text: "text-blue-600", badge: "bg-blue-500" };
    case "xls": case "xlsx": return { bg: "bg-emerald-500/10", text: "text-emerald-600", badge: "bg-emerald-500" };
    case "ppt": case "pptx": return { bg: "bg-orange-500/10", text: "text-orange-600", badge: "bg-orange-500" };
    case "zip": case "rar": return { bg: "bg-amber-500/10", text: "text-amber-600", badge: "bg-amber-500" };
    default: return { bg: "bg-slate-500/10", text: "text-slate-600", badge: "bg-slate-500" };
  }
}

export function isImageMime(mime: string) {
  return mime.startsWith("image/");
}

export function resolveFileUrl(url: string, mime?: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/")) return url;
  if (mime && !mime.startsWith("image/")) {
    return `/api/storage/download?key=${encodeURIComponent(url)}&attachment=1`;
  }
  return `/api/storage/image?key=${encodeURIComponent(url)}`;
}

export function getDateLabel(date: Date | string | null) {
  const d = toDate(date);
  if (!d) return "";
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMMM d");
}
