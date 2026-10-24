"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useScroll } from "@/features/landing/relay/hooks/smooth-scroll/use-scroll";
import { scrollTo } from "@/features/landing/relay/utils/scroll-to";
import { useShallow } from "zustand/react/shallow";

export function ScrollLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="scroll-layout">
      
      <div className="scroll-layout-content">{children}</div>

      
      <ScrollController />
    </div>
  );
}

function ScrollController() {
  const isEnableScroll = useScroll((state) => state.isEnableScroll);
  const [hash, setHash] = useState<string>("");
  const [lenis, setLenis] = useScroll(
    useShallow((state) => [state.lenis, state.setLenis]),
  );
  const pathname = usePathname();
  const savedPathname = useRef("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
    const lenis = new Lenis({
      smoothWheel: true,
    });
    (window as typeof window & { lenis: Lenis }).lenis = lenis;
    setLenis(lenis);

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    const root = document.documentElement;
    let held = false;
    const remeasure = () => {
      const hold = "preload" in root.dataset || "preloadClosing" in root.dataset;
      if (hold && !held) {
        held = true;
        lenis.stop();
      } else if (!hold && held) {
        held = false;
        window.scrollTo(0, 0);
        lenis.scrollTo(0, { immediate: true, force: true });
        if (useScroll.getState().isEnableScroll) lenis.start();
      }
      lenis.resize();
    };
    remeasure();
    const flags = new MutationObserver(remeasure);
    flags.observe(document.documentElement, {
      attributeFilter: ["data-preload", "data-preload-closing"],
    });
    document.fonts.ready.then(remeasure);

    return () => {
      cancelAnimationFrame(rafId);
      flags.disconnect();
      lenis.destroy();
      setLenis(null);
    };
  }, [setLenis]);

  useEffect(() => {
    if (isEnableScroll) {
      const { dataset } = document.documentElement;
      if (!("preload" in dataset || "preloadClosing" in dataset)) lenis?.start();
      enableNativeScroll(true);
    } else {
      lenis?.stop();
      enableNativeScroll(false);
    }
  }, [isEnableScroll, lenis]);

  useEffect(() => {
    if (lenis && hash) {
      setTimeout(() => {
        scrollTo(hash, true);
      }, 300);
    }
  }, [lenis, hash]);

  useEffect(() => {
    if (savedPathname.current !== pathname) {
      savedPathname.current = pathname;
      if (pathname.includes("#")) {
        const hash = pathname.split("#").pop();
        if (hash) {
          setHash(hash);
        }
      }
    }
  }, [pathname, setHash]);

  return null;
}

const enableNativeScroll = (value: boolean) => {
  if (typeof document === "undefined") return;
  if (!document) return;
  const html = document.querySelector("html");
  if (!html) return;
  if (!value) {
    html.style.position = "relative";
    html.style.overflow = "hidden";
    html.style.height = "100%";
  } else {
    html.style.removeProperty("position");
    html.style.removeProperty("overflow");
    html.style.removeProperty("height");
  }
};
