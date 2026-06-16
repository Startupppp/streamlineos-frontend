import "server-only";

import { OpenAIEmbeddings } from "@langchain/openai";

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

let _embeddings: OpenAIEmbeddings | null = null;

export function isEmbeddingConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function getEmbeddings(): OpenAIEmbeddings {
  if (_embeddings) return _embeddings;
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  _embeddings = new OpenAIEmbeddings({
    apiKey: process.env.OPENAI_API_KEY,
    model: EMBEDDING_MODEL,
  });
  return _embeddings;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return getEmbeddings().embedDocuments(texts);
}

export async function embedQuery(text: string): Promise<number[]> {
  return getEmbeddings().embedQuery(text);
}

export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}
