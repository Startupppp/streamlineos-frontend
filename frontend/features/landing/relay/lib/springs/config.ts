interface SpringsConfig {
  mobileWidth: number;
  disableOnMobile: {
    hover: boolean;
    inview: boolean;
    spring: boolean;
    springtrigger: boolean;
  };
}

export const springsConfig: SpringsConfig = {
  mobileWidth: 768,
  disableOnMobile: {
    hover: true,
    inview: false,
    spring: false,
    springtrigger: false,
  },
} as const;

export const isMobileDisabled = (value: boolean, viewportWidth?: number) => {
  if (typeof window === "undefined") return false;
  if (!value) return false;
  const width =
    viewportWidth && viewportWidth > 0 ? viewportWidth : window.innerWidth;
  return width <= springsConfig.mobileWidth;
};
