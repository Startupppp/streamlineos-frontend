
import { useScroll } from "@/features/landing/relay/hooks/smooth-scroll/use-scroll";

export const scrollTo = (id?: string | number, immediate?: boolean) => {
  const isEnabled = useScroll.getState().isEnableScroll;

  if (typeof id === "string") {
    const el = document.getElementById(id);
    if (!el) {
      return;
    }

    if (isEnabled) {
      useScroll.setState({ isEnableScroll: false });
    }

    setTimeout(() => {
      window.scrollTo({
        top: getDistanceFromTop(el),
        behavior: immediate ? "instant" : "smooth",
      });
    }, 50);
  } else {
    setTimeout(() => {
      window.scrollTo({
        top: Number(id) || 0,
        behavior: immediate ? "instant" : "smooth",
      });
    }, 50);
  }

  if (isEnabled) {
    setTimeout(() => {
      useScroll.setState({ isEnableScroll: true });
    }, 100);
  }

  function getDistanceFromTop(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return rect.top + scrollTop;
  }
};
