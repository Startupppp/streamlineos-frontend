import { Suspense } from "react";

import { HydrateNear } from "@/features/landing/relay/components/common/hydrate-near";
import { RobotProvider, RobotView } from "@/features/landing/relay/components/common/robot-view";
import { navMock } from "@/features/landing/relay/data/nav";
import { Backdrop } from "@/features/landing/relay/home/sections/backdrop";
import { Nav } from "@/features/landing/relay/home/sections/nav";
import { CursorDot } from "@/features/landing/relay/components/ui/cursor-dot";
import { LogoOpen } from "@/features/landing/relay/home/transitions/logo-open";
import { ScrollBlur } from "@/features/landing/relay/home/transitions/scroll-blur";
import { Hero } from "@/features/landing/relay/home/sections/hero";
import { heroMock } from "@/features/landing/relay/data/hero";
import { Integrations } from "@/features/landing/relay/home/sections/integrations";
import { integrationsMock } from "@/features/landing/relay/data/integrations";
import { Product } from "@/features/landing/relay/home/sections/product";
import { productMock } from "@/features/landing/relay/data/product";
import { Statement } from "@/features/landing/relay/home/sections/statement";
import { statementMock } from "@/features/landing/relay/data/statement";
import { Scale } from "@/features/landing/relay/home/sections/scale";
import { scaleMock } from "@/features/landing/relay/data/scale";
import { Signals } from "@/features/landing/relay/home/sections/signals";
import { signalsMock } from "@/features/landing/relay/data/signals";
import { Proof } from "@/features/landing/relay/home/sections/proof";
import { proofMock } from "@/features/landing/relay/data/proof";
import { Pricing } from "@/features/landing/relay/home/sections/pricing";
import { pricingMock } from "@/features/landing/relay/data/pricing";
import { Footer } from "@/features/landing/relay/home/sections/footer";
import { Preloader } from "@/features/landing/relay/home/preloader";
import { ParticleStream } from "@/features/landing/relay/home/stream/particle-stream";
import { footerMock } from "@/features/landing/relay/data/footer";
import { Faq } from "@/features/landing/relay/home/sections/faq";
import type { FAQ } from "@/features/landing/data/faqs";
import { PreloadScript } from "@/features/landing/relay/home/preload-script";

interface HomeViewProps {
  faqs: readonly FAQ[];
  nonce?: string;
  robot?: boolean;
}

export const HomeView = ({ faqs, nonce, robot = false }: HomeViewProps) => (
  <RobotProvider robot={robot}>
    {robot && <RobotView />}
    {!robot && <PreloadScript nonce={nonce} />}
    {!robot && <Preloader />}
    
    <div className="relay-ui overflow-x-clip">
      <main className="relative mx-page w-page overflow-y-clip">
        <Backdrop />
        
        {!robot && <ParticleStream />}
        <Nav {...navMock} />
        
        <div aria-hidden="true" className="h-22 w768:h-16 w390:h-14" />
        <Hero {...heroMock} />
        
        <Suspense>
          <HydrateNear id="integrations">
            <ScrollBlur leave still>
              <Integrations {...integrationsMock} />
            </ScrollBlur>
          </HydrateNear>
        </Suspense>
        
        <div aria-hidden="true" className="h-section-gap" />
        
        <div className="relative">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-[calc(50%-50vw)] left-[calc(50%-50vw)] border-y border-glass-slab-edge bg-glass-slab backdrop-blur-glass-slab"
          />
          <Suspense>
            <HydrateNear id="product">
              <ScrollBlur enter>
                <Product {...productMock} />
              </ScrollBlur>
            </HydrateNear>
          </Suspense>
          <div aria-hidden="true" className="h-section-gap" />
          
          <Suspense>
            <HydrateNear id="statement">
              <LogoOpen>
                <Statement {...statementMock} />
              </LogoOpen>
            </HydrateNear>
          </Suspense>
          <div aria-hidden="true" className="h-section-gap" />
          
          <Suspense>
            <HydrateNear id="scale">
              <ScrollBlur leave>
                <Scale {...scaleMock} />
              </ScrollBlur>
            </HydrateNear>
          </Suspense>
          <div aria-hidden="true" className="h-section-gap" />
          <Suspense>
            <HydrateNear id="signals">
              <ScrollBlur enter leave>
                <Signals {...signalsMock} />
              </ScrollBlur>
            </HydrateNear>
          </Suspense>
          <div aria-hidden="true" className="h-section-gap" />
          <Suspense>
            <HydrateNear id="proof">
              <ScrollBlur enter leave>
                <Proof {...proofMock} />
              </ScrollBlur>
            </HydrateNear>
          </Suspense>
        </div>
        <div aria-hidden="true" className="h-section-gap" />
        
        <Suspense>
          <HydrateNear id="pricing">
            <Pricing {...pricingMock} />
          </HydrateNear>
        </Suspense>
        <div aria-hidden="true" className="h-section-gap" />
        <Faq faqs={faqs} />
        <div aria-hidden="true" className="h-section-gap" />
        <Suspense>
          <HydrateNear id="footer">
            <Footer {...footerMock} />
          </HydrateNear>
        </Suspense>
        {!robot && <CursorDot />}
      </main>
    </div>
  </RobotProvider>
);
