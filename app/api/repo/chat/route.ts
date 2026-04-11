import { NextResponse } from "next/server";

import { isAppError } from "@/lib/errors";
import { getRepoContext } from "@/lib/github";
import { answerRepoQuestion } from "@/lib/openrouter";
import { retrieveRelevantChunks } from "@/lib/rag";
import type { ChatTurn, RepoChatResponse } from "@/lib/types";

type ChatRequestBody = {
  repoUrl?: string;
  question?: string;
  history?: ChatTurn[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequestBody;
    const repoUrl = body.repoUrl?.trim();
    const question = body.question?.trim();

    if (!repoUrl) {
      return NextResponse.json({ error: "Repository URL is required." }, { status: 400 });
    }

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }

    const repo = await getRepoContext(repoUrl);
    const chunks = retrieveRelevantChunks(repo, question);
    const answer = await answerRepoQuestion({
      repo,
      question,
      history: Array.isArray(body.history) ? body.history : [],
      chunks
    });
    const citations = [...new Set(chunks.map((chunk) => chunk.path))];

    const payload: RepoChatResponse = {
      answer,
      citations,
      sources: chunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        path: chunk.path,
        excerpt: chunk.content
      }))
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to answer that question.";
    const status = isAppError(error) ? error.statusCode : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
