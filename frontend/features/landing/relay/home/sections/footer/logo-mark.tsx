import Image from "next/image";

const SIZE = {
  md: {
    box: "size-7 rounded-footer-mark",
    glyph: "size-7",
    src: "/landing/relay/footer/footer-logo-glyph.svg",
    px: 28,
  },
  sm: {
    box: "size-6.5 rounded-footer-mark",
    glyph: "size-6.5",
    src: "/landing/relay/footer/footer-labs-glyph.svg",
    px: 26,
  },
} as const;

export const LogoMark = ({
  size,
  className = "",
}: {
  size: keyof typeof SIZE;
  className?: string;
}) => {
  const s = SIZE[size];
  return (
    <span
      aria-hidden
      className={`relative block shrink-0 overflow-clip border border-footer-mark-border bg-linear-[135deg_in_srgb] bg-origin-border from-footer-mark-from to-footer-mark-to to-[71.429%] ${s.box} ${className}`}
    >
      <Image
        src={s.src}
        alt=""
        width={s.px}
        height={s.px}
        className={`absolute -top-px -left-px max-w-none ${s.glyph}`}
      />
    </span>
  );
};
