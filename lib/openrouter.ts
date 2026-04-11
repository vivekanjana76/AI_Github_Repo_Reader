import { AppError } from "@/lib/errors";
import { getOpenRouterConfig } from "@/lib/env";
import type { ChatTurn, RepoContext, RetrievedChunk } from "@/lib/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function getResponseText(payload: OpenRouterResponse) {
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    return "";
  }

  if (typeof content === "string") {
    return content;
  }

  return content
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

type RepoQuestionInput = {
  repo: RepoContext;
  question: string;
  history: ChatTurn[];
  chunks: RetrievedChunk[];
};

async function requestChatAnswer({ repo, question, history, chunks }: RepoQuestionInput) {
  const { apiKey, model, appUrl } = getOpenRouterConfig();
  const historyText = history
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join("\n");
  const contextText = chunks
    .map(
      (chunk, index) =>
        `Source ${index + 1}: ${chunk.path}\n${chunk.content}\n---`
    )
    .join("\n");

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful AI engineer. Answer only from the provided repository context. If the context is not enough, say that clearly. Mention file paths when useful."
    },
    {
      role: "user",
      content: [
        `Repository: ${repo.owner}/${repo.name}`,
        `Default branch: ${repo.defaultBranch}`,
        `Description: ${repo.description ?? "No description"}`,
        `Dominant directories: ${repo.dominantDirectories.join(", ")}`,
        historyText ? `Recent chat:\n${historyText}` : "",
        `Retrieved context:\n${contextText}`,
        `Question: ${question}`,
        "Answer in a concise, helpful way. If you reference implementation details, mention the relevant file path."
      ]
        .filter(Boolean)
        .join("\n\n")
    }
  ];

  let response: Response;

  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: AbortSignal.timeout(45_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": appUrl,
        "X-Title": "AI Engineer Agent"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages
      })
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AppError("The model took too long to respond. Try a smaller repo or try again.", 504);
    }

    throw error;
  }

  const rawText = await response.text();
  let payload: OpenRouterResponse;

  try {
    payload = JSON.parse(rawText) as OpenRouterResponse;
  } catch {
    throw new AppError("OpenRouter returned a non-JSON response.", 502);
  }

  if (!response.ok) {
    throw new AppError(payload.error?.message || "OpenRouter request failed.", response.status);
  }

  return payload;
}

export async function answerRepoQuestion(input: RepoQuestionInput) {
  const payload = await requestChatAnswer(input);
  const content = getResponseText(payload);

  if (!content) {
    throw new AppError("OpenRouter returned an empty response.", 502);
  }

  return content;
}
