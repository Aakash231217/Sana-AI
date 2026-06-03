import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { db } from '@/server/db';
import { getPineconeClient } from '@/lib/pinecone';
import { OpenAIEmbeddings } from "@langchain/openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, fileId } = await req.json();

    // If a fileId is provided, use the RAG pipeline for book-aware answers
    if (fileId) {
      const file = await db.file.findFirst({ where: { id: fileId } });

      if (file) {
        const lastUserMessage = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
        const queryText = lastUserMessage?.content || '';

        // Generate embedding and query Pinecone
        const embeddings = new OpenAIEmbeddings({
          openAIApiKey: process.env.OPENAI_API_KEY,
        });
        const queryEmbedding = await embeddings.embedQuery(queryText);

        const pinecone = await getPineconeClient();
        const pineconeIndex = pinecone.Index('sana-ai');

        const queryResponse = await pineconeIndex
          .namespace(file.id)
          .query({
            vector: queryEmbedding,
            topK: 8,
            includeValues: false,
            includeMetadata: true,
          });

        const contextWithPages = queryResponse.matches
          ?.filter((match) => (match.metadata?.text as string)?.trim().length > 0)
          .map((match) => {
            const pageNum = match.metadata?.pageNumber ? `[Page ${match.metadata.pageNumber}]` : '[Page unknown]';
            return `${pageNum} ${match.metadata?.text as string}`;
          })
          .join('\n\n') || '';

        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          messages: [
            {
              role: "system",
              content: `You are Sana-Sigma, an intelligent academic tutor. Answer questions based on the provided book context. Always cite page numbers. Use markdown formatting. Be encouraging and educational.`
            },
            {
              role: "user",
              content: `Answer based on the following book context. Cite page numbers when possible. If the answer cannot be found in the context, say so.

CONTEXT:
${contextWithPages}

USER QUESTION: ${queryText}`
            }
          ],
        });

        const reply = completion.choices[0].message.content;
        return NextResponse.json({ reply });
      }
    }

    // Fallback: generic AI response (no book context)
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: "system",
          content: "You are Sana-Sigma, a helpful, encouraging, and intelligent academic tutor for students. Keep answers concise, educational, and engaging. Use emojis occasionally."
        },
        ...messages
      ],
    });

    const reply = completion.choices[0].message.content;

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('OpenAI Error:', error);
    return NextResponse.json({ error: 'Failed to fetch response' }, { status: 500 });
  }
}