import { warmScreenshotCache } from "./screenshot";
import { unwrapEnvelope } from "./api";
import { FeedbucketWidget } from "./ui";

async function getAiAssistConfig(apiBase: string, embedKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/public/feedbucket/${embedKey}/config`);
    if (!res.ok) return false;
    const json: unknown = unwrapEnvelope(await res.json());
    if (json === null || typeof json !== "object") return false;
    if (!("aiAssistEnabled" in json)) return false;
    const val: unknown = Reflect.get(json, "aiAssistEnabled");
    return val === true;
  } catch {
    return false;
  }
}

export function mountWidget(
  hostEl: HTMLElement,
  apiBase: string,
  embedKey: string,
): void {
  void bootstrapWidget(hostEl, apiBase, embedKey);
  setTimeout(warmScreenshotCache, 2000);
}

async function bootstrapWidget(
  hostEl: HTMLElement,
  apiBase: string,
  embedKey: string,
): Promise<void> {
  const aiAssistEnabled = await getAiAssistConfig(apiBase, embedKey);
  new FeedbucketWidget(hostEl, apiBase, embedKey, aiAssistEnabled);
}
