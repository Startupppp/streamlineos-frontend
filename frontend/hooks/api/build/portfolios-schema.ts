import {
  portfoliosListPortfoliosResponseSchema,
  portfoliosCreatePortfolioResponseSchema,
  portfoliosGetPortfolioResponseSchema,
  portfoliosLinkProjectResponseSchema,
  programsListProgramsResponseSchema,
  programsCreateProgramResponseSchema,
} from "@/contracts/build-contracts.generated";

export const portfolioRowContract = portfoliosCreatePortfolioResponseSchema;

export const portfolioPageContract = portfoliosListPortfoliosResponseSchema;

export const portfolioDetailContract = portfoliosGetPortfolioResponseSchema;

export const programRowContract = programsCreateProgramResponseSchema;

export const programPageContract = programsListProgramsResponseSchema;

export const programListItemContract = programsListProgramsResponseSchema.shape.data.element;

export const portfoliosSuccessContract = portfoliosLinkProjectResponseSchema;
