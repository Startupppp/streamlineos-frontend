import Image from "next/image";
import { MotionReveal } from "../components/motion/motion-reveal";
import { REVEAL } from "./motion";
import { CONTAINER } from "./section";
import valleyImage from "@/public/landing/valley.webp";

/** A shorter, photographic opening for marketing pages other than home. */
export function PageHero({ title, lede }: { title: string; lede: string }) {
  return (
    <section className="relative isolate overflow-hidden pb-20 pt-36 sm:pb-28 sm:pt-44">
      {/* Masked rather than overlaid with a canvas gradient, so no sub-pixel seam shows at the edge. */}
      <div aria-hidden className="absolute inset-0 -z-10 mask-b-from-60%">
        <Image
          src={valleyImage}
          alt=""
          fill
          priority
          placeholder="blur"
          sizes="100vw"
          className="object-cover object-[50%_40%]"
        />
        <div className="absolute inset-0 bg-(--lp-canvas)/55" />
      </div>
      <MotionReveal transition={REVEAL} className={`${CONTAINER} text-center`}>
        <h1 className="lp-display mx-auto max-w-3xl text-balance text-5xl text-foreground sm:text-7xl">
          {title}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-(--lp-ink)/75 sm:text-lg">
          {lede}
        </p>
      </MotionReveal>
    </section>
  );
}
