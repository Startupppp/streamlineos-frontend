"use client";

import { apiClient } from "@/lib/api-client";

export async function blogAiImproveWriting(postId: string, content: string): Promise<{ content: string }> {
  return apiClient.post<{ content: string }>(`/ai/blog/posts/${postId}/improve-writing`, { content });
}

export async function blogAiSuggestTitle(postId: string, content?: string, excerpt?: string): Promise<{ title: string }> {
  return apiClient.post<{ title: string }>(`/ai/blog/posts/${postId}/suggest-title`, { content, excerpt });
}

export async function blogAiSummarize(postId: string, content?: string): Promise<{ excerpt: string }> {
  return apiClient.post<{ excerpt: string }>(`/ai/blog/posts/${postId}/summarize`, { content });
}
