import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { getRepoContext } from "@/lib/github";
import { answerRepoQuestion } from "@/lib/openrouter";
import { retrieveRelevantChunks } from "@/lib/rag";
import type { ChatTurn, RepoChatResponse } from "@/lib/types";
import { AppError } from "@/utils/errors";
import { createErrorResponse, parseJsonBody, requireTrimmedString } from "@/utils/http";

type ChatRequestBody = {
  repoUrl?: string;
  question?: string;
  history?: ChatTurn[];
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      throw new AppError("You must be signed in to chat with repositories.", 401);
    }

    const body = await parseJsonBody<ChatRequestBody>(request);
    const repoUrl = requireTrimmedString(body.repoUrl, "Repository URL is required.");
    const question = requireTrimmedString(body.question, "Question is required.");

    const history = Array.isArray(body.history) ? body.history : [];
    const repo = await getRepoContext(repoUrl);
    const chunks = retrieveRelevantChunks(repo, question, history);
    const answer = await answerRepoQuestion({
      repo,
      question,
      history,
      chunks
    });
    const citations = [...new Set(chunks.map((chunk) => chunk.path))];

    const payload: RepoChatResponse = {
      answer,
      citations,
      sources: chunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        path: chunk.path,
        excerpt: chunk.content,
        lineStart: chunk.lineStart,
        lineEnd: chunk.lineEnd,
        score: chunk.score,
        reason: chunk.reason
      }))
    };

    return NextResponse.json(payload);
  } catch (error) {
    return createErrorResponse(error, "Unable to answer that question.");
  }
}
