import Image from "next/image";
import { MotionReveal } from "../components/motion/motion-reveal";
import { REVEAL, VIEWPORT_EARLY } from "./motion";
import { Assurances, CONTAINER, StartLink } from "./section";
import ctaImage from "@/public/landing/cta.webp";

export function FinalCTA() {
  return (
    <section className="py-12 sm:py-16">
      <div className={CONTAINER}>
        <MotionReveal
          variant="scaleIn"
          viewport={VIEWPORT_EARLY}
          transition={REVEAL}
          className="relative isolate flex min-h-[28rem] flex-col items-center justify-center overflow-hidden rounded-3xl px-6 py-20 text-center"
        >
          <Image src={ctaImage} alt="" fill sizes="(min-width: 1280px) 1216px, 100vw" className="-z-10 object-cover" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-(--lp-ink)/45" />
          <h2 className="lp-display max-w-3xl text-balance text-5xl text-white sm:text-7xl">
            Build your company’s OS today, free
          </h2>
          <p className="mt-5 max-w-md text-lg text-white/85">
            Turn on the modules you need today and add the rest whenever you are ready.
          </p>
          <StartLink tone="light" className="mt-9" />
          <Assurances tone="light" className="mt-5" />
        </MotionReveal>
      </div>
    </section>
  );
}
