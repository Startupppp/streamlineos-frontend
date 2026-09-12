"use client";

import { useSyncExternalStore } from "react";

export type ScriptState = "idle" | "loading" | "ready" | "failed";

let _state: ScriptState = "idle";
let _loadPromise: Promise<void> | null = null;
const _listeners = new Set<() => void>();

function _notify(): void {
  _listeners.forEach((l) => l());
}

function _subscribe(listener: () => void): () => void {
  _listeners.add(listener);
  return () => {
    _listeners.delete(listener);
  };
}

function _getSnapshot(): ScriptState {
  return _state;
}

function _getServerSnapshot(): ScriptState {
  return "idle";
}

export function loadCheckoutScript(): Promise<void> {
  if (_state === "ready") return Promise.resolve();
  if (_loadPromise) return _loadPromise;
  _state = "loading";
  _notify();
  _loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") {
      _state = "failed";
      _loadPromise = null;
      _notify();
      reject(new Error("checkout-script: document not available"));
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      _state = "ready";
      _notify();
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      _state = "ready";
      _notify();
      resolve();
    };
    script.onerror = () => {
      _state = "failed";
      _loadPromise = null;
      _notify();
      reject(new Error("Razorpay checkout script failed to load"));
    };
    document.body.appendChild(script);
  });
  return _loadPromise;
}

export function retryCheckoutScript(): void {
  if (_state !== "failed" && _state !== "idle") return;
  _state = "idle";
  _loadPromise = null;
  _notify();
  void loadCheckoutScript();
}

export function useCheckoutScript(): { state: ScriptState; retry: () => void } {
  const scriptState = useSyncExternalStore(_subscribe, _getSnapshot, _getServerSnapshot);
  return { state: scriptState, retry: retryCheckoutScript };
}
