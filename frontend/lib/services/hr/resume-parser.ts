import "server-only";
import { z } from "zod";
import { aiInvoke, isOpenAIConfigured } from "@/lib/ai/openai";

const resumeSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  currentCompany: z.string().nullable(),
  currentRole: z.string().nullable(),
  experienceYears: z.number().nullable(),
  skills: z.array(z.string()),
  location: z.string().nullable(),
  education: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  portfolioUrl: z.string().nullable(),
});

export type ParsedResume = z.infer<typeof resumeSchema>;

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function fallbackExtract(text: string): ParsedResume {
  const emailMatch = text.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = text.match(/(\+?[\d\s\-().]{7,15}\d)/);
  const nameMatch = text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3})/m);
  const linkedinMatch = text.match(/(https?:\/\/(?:www\.)?linkedin\.com\/in\/[^\s]+)/i);
  const portfolioMatch = text.match(/(https?:\/\/(?:github\.com|portfolio\.|behance\.net|dribbble\.com)[^\s]+)/i);

  return {
    name: nameMatch?.[1] ?? null,
    email: emailMatch?.[1] ?? null,
    phone: phoneMatch?.[1] ?? null,
    currentCompany: null,
    currentRole: null,
    experienceYears: null,
    skills: [],
    location: null,
    education: null,
    linkedinUrl: linkedinMatch?.[1] ?? null,
    portfolioUrl: portfolioMatch?.[1] ?? null,
  };
}

export async function extractResumeText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
    return extractTextFromPdf(buffer);
  }
  if (mimeType.includes("docx") || mimeType.includes("openxmlformats") || mimeType.includes("word")) {
    return extractTextFromDocx(buffer);
  }
  return buffer.toString("utf-8").slice(0, 50000);
}

export async function parseResumeText(text: string): Promise<ParsedResume> {
  const trimmed = text.slice(0, 12000);

  if (!isOpenAIConfigured()) {
    return fallbackExtract(trimmed);
  }

  try {
    return await aiInvoke({
      model: "fast",
      schema: resumeSchema,
      schemaName: "ParsedResume",
      system: `You are an expert resume parser. Extract structured information from the resume text provided. Return null for fields that cannot be found. For skills, return a list of technical and professional skills mentioned. For experienceYears, calculate based on work history if possible, otherwise return null.`,
      user: `Parse the following resume and extract the requested fields:\n\n${trimmed}`,
    });
  } catch {
    return fallbackExtract(trimmed);
  }
}
