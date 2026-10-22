import { useScroll } from "@/features/landing/relay/hooks/smooth-scroll/use-scroll";

export const readScrollY = (): number => {
  const lenis = useScroll.getState().lenis;
  return lenis ? lenis.scroll : window.scrollY;
};
