"use client";

import { GoalsGalleryCases } from "./goals-gallery-section";
import { PortfoliosProgramsGalleryCases } from "./portfolios-programs-gallery-section";
import { RoadmapGalleryCases } from "./roadmap-gallery-section";

export function PlanningSurfacesExtraSections() {
  return (
    <div className="flex flex-col gap-8">
      <GoalsGalleryCases />
      <PortfoliosProgramsGalleryCases />
      <RoadmapGalleryCases />
    </div>
  );
}
