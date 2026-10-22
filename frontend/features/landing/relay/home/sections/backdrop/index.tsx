import Image, { getImageProps } from "next/image";

const { props: dotField } = getImageProps({
  src: "/landing/relay/backdrop/backdrop-dot-field.svg",
  alt: "",
  width: 1440,
  height: 1060,
  loading: "eager",
  fetchPriority: "high",
  decoding: "sync",
});
const { props: dotField768 } = getImageProps({
  src: "/landing/relay/backdrop/backdrop-dot-field-768.svg",
  alt: "",
  width: 768,
  height: 1154,
});

export const Backdrop = () => (
  <div aria-hidden className="pointer-events-none absolute inset-0">
    <div className="absolute inset-x-0 top-0 h-288.5">
      <div className="absolute top-0 right-[calc(50%-50vw)] left-[calc(50%-50vw)] h-140 bg-linear-to-b/srgb from-backdrop-light to-transparent w768:h-139.75" />
      
      <picture>
        <source media="(max-width: 900px)" srcSet={dotField768.srcSet ?? dotField768.src} />
        <img
          {...dotField}
          alt=""
          className="absolute top-0 left-0 h-265 w-page max-w-none translate-y-[calc(var(--hero-extra)/2)] w1024:w-360 w768:h-288.5 w768:w-192"
        />
      </picture>
      <Image
        src="/landing/relay/backdrop/backdrop-specks-and-marks.svg"
        alt=""
        width={1440}
        height={1180}
        className="absolute top-0 left-0 h-295 w-page max-w-none translate-y-[calc(var(--hero-extra)/2)] w1024:w-360 w768:h-[calc(var(--spacing)*272.3)]"
        priority
        fetchPriority="high"
        decoding="sync"
      />
      
    </div>
    <Image
      src="/landing/relay/backdrop/field-texture.svg"
      alt=""
      width={1440}
      height={2400}
      className="absolute top-945.25 left-0 h-600 w-page max-w-none translate-y-(--hero-extra) opacity-35"
    />
  </div>
);
