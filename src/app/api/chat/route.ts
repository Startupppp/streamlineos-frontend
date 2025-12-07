import { google } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: google('gemini-1.5-pro-latest'),
    messages,
    system: `You are 'Vaivamm', an intelligent AI assistant for the Vaivamm CRM. 
    You help users with HR tasks, Project Management, and analyzing data.
    Tone: Professional, Helpful, Futuristic.
    If asked about company data, say you can access real-time stats (Mock this for now).`,
  });

  return result.toDataStreamResponse();
}
