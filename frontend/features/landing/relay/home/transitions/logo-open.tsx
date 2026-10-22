"use client";

import Image from "next/image";
import { useEffect, useRef, type ReactNode } from "react";

import { fold } from "./fold";

const PIN = 240;
const OPEN = 300;
const CLOSE = 320;
const CLOSE_LEAD = 0;
const POP = 60;
const FLIGHT = 300;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const linear = (t: number) => t;

const Glyph = () => (
  <Image
    src="/landing/relay/statement/statement-mark-glyph.svg"
    alt=""
    width={34}
    height={37}
    className="absolute top-[24.3%] left-[28.25%] h-[48.76%] w-[44.1%] max-w-none"
  />
);

export const LogoOpen = ({ children }: { children: ReactNode }) => {
  const wrap = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const fly = useRef<HTMLDivElement>(null);
  const flyRuntime = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const w = wrap.current;
    const p = plate.current;
    const m = mark.current;
    const f = fly.current;
    const fr = flyRuntime.current;
    if (!w || !p || !m || !f || !fr) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let target: HTMLElement | null = null;
    const last = new Map<string, string>();
    const changed = (key: string, v: string) => {
      if (last.get(key) === v) return false;
      last.set(key, v);
      return true;
    };
    const set = (name: string, v: number) => {
      const text = v.toFixed(4);
      if (changed(name, text)) p.style.setProperty(name, text);
    };
    const setStyle = (
      el: HTMLElement,
      key: string,
      prop: "clipPath" | "opacity" | "transform" | "width" | "height",
      v: string,
    ) => {
      if (changed(key, v)) el.style[prop] = v;
    };

    let k = 1;
    let plateRound = 0;
    let markSize = 0;
    let mx = 0;
    let my = 0;
    const measure = () => {
      k = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
      plateRound =
        parseFloat(
          getComputedStyle(p.firstElementChild ?? p).borderTopLeftRadius,
        ) || 0;
      const own = p.querySelector<HTMLElement>("[data-statement-mark]");
      markSize = own?.offsetWidth ?? 76 * k;
      mx = own ? own.offsetLeft + markSize / 2 : p.offsetWidth / 2;
      my = own ? own.offsetTop + own.offsetHeight / 2 : p.offsetHeight / 2;
      p.style.setProperty("--mx", `${mx}px`);
      p.style.setProperty("--my", `${my}px`);
      p.style.setProperty("--msize", `${markSize}px`);
    };

    const update = () => {
      if (media.matches) {
        w.dataset.reduced = "true";
        w.dataset.open = "true";
        set("--grow", 1);
        setStyle(p, "clip", "clipPath", "none");
        f.hidden = true;
        return;
      }
      delete w.dataset.reduced;
      const vh = window.innerHeight;
      const plateH = p.offsetHeight;
      const plateW = p.offsetWidth;
      const wrapTop = w.getBoundingClientRect().top;
      target ??= document.querySelector<HTMLElement>("[data-logo-target]");
      const to = target?.getBoundingClientRect();
      const from = m.getBoundingClientRect();

      const pinTop = (vh - plateH) / 2;
      const s = pinTop - wrapTop;
      const seenAt = pinTop + my - vh;
      const openEnd = seenAt + POP * k + OPEN * k;
      const closeStart = (PIN - CLOSE_LEAD) * k;
      const closeEnd = closeStart + CLOSE * k;

      const pop = smooth(clamp((s - seenAt) / (POP * k)));
      const opening = clamp((s - seenAt - POP * k) / (OPEN * k));
      const closing = clamp((closeEnd - s) / (CLOSE * k));
      set("--pop", pop);
      if (changed("--shift", "0px")) p.style.setProperty("--shift", "0px");
      const grow = smooth(Math.min(opening, closing));
      set("--grow", grow);
      setStyle(
        p,
        "clip",
        "clipPath",
        fold(grow, plateW, plateH, mx, my, markSize, plateRound, linear),
      );

      if (s >= openEnd && w.dataset.open !== "true") w.dataset.open = "true";
      if (s < seenAt && w.dataset.open === "true") w.dataset.open = "false";

      if (!target || !to) return;
      const t = clamp((s - closeEnd) / (FLIGHT * k));
      const flying = t > 0 && t < 1;
      if (s > closeEnd && w.dataset.open === "true") w.dataset.open = "false";

      set("--flying", t > 0 ? 1 : 0);
      setStyle(target, "target", "opacity", flying ? "0" : "");
      if (f.hidden !== !flying) f.hidden = !flying;
      if (!flying) return;
      const e = smooth(t);
      const size = from.width + (to.width - from.width) * e;
      const x = from.left + (to.left - from.left) * e;
      const y = from.top + (to.top - from.top) * e;
      setStyle(f, "fly-t", "transform", `translate(${x}px, ${y}px)`);
      setStyle(f, "fly-w", "width", `${size}px`);
      setStyle(f, "fly-h", "height", `${size}px`);
      setStyle(fr, "fly-o", "opacity", String(clamp((e - 0.35) / 0.5)));
    };

    const onResize = () => {
      measure();
      update();
    };
    measure();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    media.addEventListener("change", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", onResize);
      media.removeEventListener("change", update);
      if (target) target.style.opacity = "";
    };
  }, []);

  return (
    <div
      ref={wrap}
      data-open="false"
      className="logo-open-wrap relative h-[calc(34.5rem+15rem)] w1024:h-[calc(33rem+15rem)] w390:h-[calc(23.1875rem+15rem)]"
    >
      <div ref={plate} className="logo-open sticky top-[calc(50lvh-16.875rem)]">
        {children}
        <span ref={mark} aria-hidden="true" className="logo-open-mark">
          <Glyph />
        </span>
      </div>
      <div
        ref={fly}
        hidden
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 z-30"
      >
        <span className="logo-open-fly">
          <Glyph />
        </span>
        <span
          ref={flyRuntime}
          className="absolute inset-0 bg-[url(/landing/relay/scale/scale-runtime.svg)] bg-cover"
        />
      </div>
    </div>
  );
};
