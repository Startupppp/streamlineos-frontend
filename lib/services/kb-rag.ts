import "server-only";

import { and, eq } from "drizzle-orm";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { db, client } from "@/lib/db";
import {
  kbArticles,
  kbArticleAttachments,
  kbArticleChunks,
  type KbChunkSource,
} from "@/lib/db/schema";
import { getFileStream } from "@/lib/storage";
import {
  EMBEDDING_MODEL,
  embedQuery,
  embedTexts,
  isEmbeddingConfigured,
  toVectorLiteral,
} from "@/lib/ai/embeddings";
import { aiText, isOpenAIConfigured } from "@/lib/ai/openai";
import { logger } from "@/lib/logger";
import { buffer as streamToBuffer } from "node:stream/consumers";

const CHUNK_SIZE = 1800;
const CHUNK_OVERLAP = 200;
const EMBED_BATCH = 96;
const MAX_CHUNKS_PER_ARTICLE = 400;
const DEFAULT_TOP_K = 6;
const MIN_DISPLAY_SIMILARITY = 0.2;

interface PendingChunk {
  source: KbChunkSource;
  attachmentId: number | null;
  content: string;
}

export interface KbAnswerSource {
  articleId: number;
  title: string;
  slug: string;
  attachmentId: number | null;
  attachmentName: string | null;
  similarity: number;
}

export interface KbAnswer {
  answer: string;
  sources: KbAnswerSource[];
  hasContext: boolean;
}

export interface KbSearchResult {
  id: number;
  articleId: number;
  attachmentId: number | null;
  source: string;
  content: string;
  title: string;
  slug: string;
  attachmentName: string | null;
  similarity: number;
}

interface KbSearchRow {
  id: number;
  article_id: number;
  attachment_id: number | null;
  source: string;
  content: string;
  title: string;
  slug: string;
  attachment_name: string | null;
  similarity: number;
}

function stripToPlainText(input: string): string {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>~]/g, " ")
    .replace(/\|/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= CHUNK_SIZE) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const newline = clean.lastIndexOf("\n", end);
      const space = clean.lastIndexOf(" ", end);
      const boundary = Math.max(newline, space);
      if (boundary > start + CHUNK_SIZE * 0.5) end = boundary;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

type AttachmentRow = typeof kbArticleAttachments.$inferSelect;

async function extractAttachmentText(att: AttachmentRow): Promise<string | null> {
  const mime = att.mimeType ?? "";
  const name = att.fileName.toLowerCase();
  const isPdf = mime === "application/pdf" || name.endsWith(".pdf");
  const isDocx =
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");
  const isText =
    mime.startsWith("text/") ||
    name.endsWith(".txt") ||
    name.endsWith(".md") ||
    name.endsWith(".markdown");

  if (!isPdf && !isDocx && !isText) return null;

  const { body } = await getFileStream(att.fileKey);
  const buffer = await streamToBuffer(body);

  if (isPdf) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }

  if (isDocx) {
    const { extractRawText } = await import("mammoth");
    const { value } = await extractRawText({ buffer });
    return value;
  }

  return buffer.toString("utf8");
}

async function embedInBatches(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const batch = texts.slice(i, i + EMBED_BATCH);
    const vectors = await embedTexts(batch);
    out.push(...vectors);
  }
  return out;
}

export interface IndexArticleResult {
  chunks: number;
  warnings: string[];
}

export async function indexArticle(
  orgId: string,
  articleId: number,
): Promise<IndexArticleResult> {
  if (!isEmbeddingConfigured()) {
    throw new Error("Embeddings are not configured");
  }

  const [article] = await db
    .select({
      id: kbArticles.id,
      title: kbArticles.title,
      content: kbArticles.content,
    })
    .from(kbArticles)
    .where(and(eq(kbArticles.id, articleId), eq(kbArticles.orgId, orgId)))
    .limit(1);

  if (!article) {
    throw new Error("Article not found");
  }

  const attachments = await db
    .select()
    .from(kbArticleAttachments)
    .where(
      and(
        eq(kbArticleAttachments.articleId, articleId),
        eq(kbArticleAttachments.orgId, orgId),
      ),
    );

  const pending: PendingChunk[] = [];
  const warnings: string[] = [];

  const titlePrefix = article.title ? `${article.title}\n\n` : "";
  const bodyText = `${titlePrefix}${stripToPlainText(article.content ?? "")}`.trim();
  for (const chunk of chunkText(bodyText)) {
    pending.push({ source: "article_body", attachmentId: null, content: chunk });
  }

  for (const att of attachments) {
    let text: string | null = null;
    try {
      text = await extractAttachmentText(att);
    } catch {
      warnings.push(`${att.fileName}: could not be read`);
      continue;
    }
    if (text === null) continue;
    if (!text.trim()) {
      warnings.push(`${att.fileName}: no extractable text (scanned image?)`);
      continue;
    }
    for (const chunk of chunkText(text)) {
      pending.push({ source: "attachment", attachmentId: att.id, content: chunk });
    }
  }

  if (pending.length > MAX_CHUNKS_PER_ARTICLE) {
    warnings.push(
      `Content was large — only the first ${MAX_CHUNKS_PER_ARTICLE} passages were indexed`,
    );
    pending.length = MAX_CHUNKS_PER_ARTICLE;
  }

  const embeddings = pending.length
    ? await embedInBatches(pending.map((p) => p.content))
    : [];

  await db.transaction(async (tx) => {
    await tx.delete(kbArticleChunks).where(eq(kbArticleChunks.articleId, articleId));
    if (pending.length) {
      await tx.insert(kbArticleChunks).values(
        pending.map((p, i) => ({
          orgId,
          articleId,
          attachmentId: p.attachmentId,
          source: p.source,
          chunkIndex: i,
          content: p.content,
          tokens: approxTokens(p.content),
          embedding: embeddings[i],
          embeddingModel: EMBEDDING_MODEL,
        })),
      );
    }
  });

  return { chunks: pending.length, warnings };
}

export interface IndexAllResult {
  total: number;
  indexed: number;
  totalChunks: number;
  failures: { articleId: number; error: string }[];
}

export async function indexAllArticles(orgId: string): Promise<IndexAllResult> {
  if (!isEmbeddingConfigured()) {
    throw new Error("Embeddings are not configured");
  }

  const articles = await db
    .select({ id: kbArticles.id })
    .from(kbArticles)
    .where(eq(kbArticles.orgId, orgId));

  const result: IndexAllResult = {
    total: articles.length,
    indexed: 0,
    totalChunks: 0,
    failures: [],
  };

  for (const article of articles) {
    try {
      const { chunks } = await indexArticle(orgId, article.id);
      result.indexed += 1;
      result.totalChunks += chunks;
    } catch (error) {
      result.failures.push({
        articleId: article.id,
        error: error instanceof Error ? error.message : "Unknown",
      });
    }
  }

  return result;
}

export async function reindexArticleSafe(
  orgId: string,
  articleId: number,
): Promise<void> {
  if (!isEmbeddingConfigured()) return;
  try {
    await indexArticle(orgId, articleId);
  } catch (error) {
    logger.error("KB article reindex failed", {
      articleId,
      error: error instanceof Error ? error.message : "Unknown",
    });
  }
}

export interface SearchChunksOptions {
  orgId: string;
  question: string;
  articleId?: number;
  limit?: number;
  publicOnly?: boolean;
}

export async function searchChunks(
  opts: SearchChunksOptions,
): Promise<KbSearchResult[]> {
  const { orgId, question, articleId, limit = DEFAULT_TOP_K, publicOnly = false } = opts;
  const vector = toVectorLiteral(await embedQuery(question));

  const rows = await client<KbSearchRow[]>`
    SELECT c.id, c.article_id, c.attachment_id, c.source, c.content,
           a.title, a.slug, att.file_name AS attachment_name,
           (1 - (c.embedding <=> ${vector}::vector))::float8 AS similarity
    FROM kb_article_chunks c
    JOIN kb_articles a ON a.id = c.article_id
    LEFT JOIN kb_article_attachments att ON att.id = c.attachment_id
    WHERE c.org_id = ${orgId}
      ${articleId ? client`AND c.article_id = ${articleId}` : client``}
      ${publicOnly ? client`AND a.status = 'published' AND a.visibility = 'public'` : client``}
    ORDER BY c.embedding <=> ${vector}::vector ASC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    articleId: r.article_id,
    attachmentId: r.attachment_id,
    source: r.source,
    content: r.content,
    title: r.title,
    slug: r.slug,
    attachmentName: r.attachment_name,
    similarity: r.similarity,
  }));
}

async function generateAnswer(system: string, user: string): Promise<string> {
  if (isOpenAIConfigured()) {
    return aiText({ model: "fast", system, user, temperature: 0.2 });
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system,
      prompt: user,
      temperature: 0.2,
    });
    return text;
  }
  throw new Error("No AI provider configured");
}

function dedupeSources(results: KbSearchResult[]): KbAnswerSource[] {
  const seen = new Set<string>();
  const sources: KbAnswerSource[] = [];
  for (const r of results) {
    if (r.similarity < MIN_DISPLAY_SIMILARITY) continue;
    const key = `${r.articleId}:${r.attachmentId ?? "body"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push({
      articleId: r.articleId,
      title: r.title,
      slug: r.slug,
      attachmentId: r.attachmentId,
      attachmentName: r.attachmentName,
      similarity: r.similarity,
    });
  }
  return sources;
}

export interface AnswerQuestionOptions {
  orgId: string;
  question: string;
  articleId?: number;
  publicOnly?: boolean;
}

export async function answerQuestion(
  opts: AnswerQuestionOptions,
): Promise<KbAnswer> {
  const results = await searchChunks({
    orgId: opts.orgId,
    question: opts.question,
    articleId: opts.articleId,
    publicOnly: opts.publicOnly,
  });

  if (results.length === 0) {
    return {
      answer:
        "I couldn't find anything related to that in the knowledge base yet.",
      sources: [],
      hasContext: false,
    };
  }

  const context = results
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}${r.attachmentName ? ` — ${r.attachmentName}` : ""}\n${r.content}`,
    )
    .join("\n\n---\n\n");

  const system =
    "You are a knowledge base assistant. Answer the user's question using ONLY the provided context excerpts. " +
    "Be concise and accurate. Cite supporting excerpts inline using their bracket number, e.g. [1]. " +
    "If the context does not contain the answer, clearly say you don't have that information in the knowledge base. " +
    "Never invent facts that are not in the context.";

  const user = `Context excerpts:\n\n${context}\n\nQuestion: ${opts.question}`;

  const answer = await generateAnswer(system, user);

  return {
    answer: answer.trim(),
    sources: dedupeSources(results),
    hasContext: true,
  };
}

export async function getArticleIndexStatus(
  orgId: string,
  articleId: number,
): Promise<{ chunks: number; lastIndexedAt: string | null }> {
  const [row] = await client<{ chunks: string; last_indexed_at: string | null }[]>`
    SELECT count(*)::text AS chunks, max(created_at)::text AS last_indexed_at
    FROM kb_article_chunks
    WHERE org_id = ${orgId} AND article_id = ${articleId}
  `;
  return {
    chunks: row ? Number(row.chunks) : 0,
    lastIndexedAt: row?.last_indexed_at ?? null,
  };
}
