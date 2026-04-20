import { AppError } from "@/lib/errors";
import { getOpenRouterConfig } from "@/lib/env";
import type { ChatTurn, RepoContext, RetrievedChunk } from "@/lib/types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_CONTEXT_CHARS = 10_500;

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

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

type RepoQuestionInput = {
  repo: RepoContext;
  question: string;
  history: ChatTurn[];
  chunks: RetrievedChunk[];
};

type JsonCompletionInput = {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
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

function extractJsonObject(text: string) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new AppError("The model response did not contain valid JSON.", 502);
  }

  return text.slice(firstBrace, lastBrace + 1);
}

async function sendCompletionRequest(
  messages: OpenRouterMessage[],
  options?: {
    maxTokens?: number;
    temperature?: number;
    responseFormat?: "json";
  }
) {
  const { apiKey, model, appUrl } = getOpenRouterConfig();
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
        temperature: options?.temperature ?? 0.15,
        max_tokens: options?.maxTokens ?? 1000,
        ...(options?.responseFormat === "json"
          ? {
              response_format: {
                type: "json_object"
              }
            }
          : {}),
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

function summarizeHistory(history: ChatTurn[]) {
  return history
    .slice(-6)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");
}

function buildContextBlock(chunks: RetrievedChunk[]) {
  const sections: string[] = [];
  let totalChars = 0;

  for (const chunk of chunks) {
    const section = [
      `Path: ${chunk.path}`,
      `Lines: ${chunk.lineStart}-${chunk.lineEnd}`,
      `Retrieval score: ${chunk.score}`,
      `Why retrieved: ${chunk.reason || "relevant lexical overlap"}`,
      `Matched terms: ${chunk.matchedTerms.join(", ") || "none"}`,
      "Snippet:",
      chunk.content
    ].join("\n");

    if (totalChars + section.length > MAX_CONTEXT_CHARS && sections.length > 0) {
      break;
    }

    sections.push(section);
    totalChars += section.length;
  }

  return sections.join("\n\n---\n\n");
}

export async function requestJsonCompletion(input: JsonCompletionInput) {
  let payload = await sendCompletionRequest(
    [
      { role: "system", content: input.system },
      { role: "user", content: input.user }
    ],
    {
      maxTokens: input.maxTokens ?? 1500,
      temperature: input.temperature ?? 0.1,
      responseFormat: "json"
    }
  );

  let text = getResponseText(payload);

  try {
    return JSON.parse(extractJsonObject(text));
  } catch {
    payload = await sendCompletionRequest(
      [
        { role: "system", content: input.system },
        {
          role: "user",
          content: `${input.user}\n\nYour previous response was not valid JSON. Return only a single valid JSON object.`
        }
      ],
      {
        maxTokens: input.maxTokens ?? 1500,
        temperature: input.temperature ?? 0.1
      }
    );

    text = getResponseText(payload);
    return JSON.parse(extractJsonObject(text));
  }
}

export async function answerRepoQuestion({ repo, question, history, chunks }: RepoQuestionInput) {
  const historyText = summarizeHistory(history);
  const contextText = buildContextBlock(chunks);

  const payload = await sendCompletionRequest(
    [
      {
        role: "system",
        content: [
          "You are a helpful AI engineer answering questions about a GitHub repository.",
          "Use only the supplied repository context and recent chat history.",
          "If the retrieved context is insufficient, say so clearly instead of guessing.",
          "When citing implementation details, reference file paths and line ranges like `src/app.ts:10-24`."
        ].join(" ")
      },
      {
        role: "user",
        content: [
          `Repository: ${repo.owner}/${repo.name}`,
          `Default branch: ${repo.defaultBranch}`,
          `Description: ${repo.description ?? "No description"}`,
          `Dominant directories: ${repo.dominantDirectories.join(", ")}`,
          historyText ? `Recent chat history:\n${historyText}` : "",
          `Retrieved repository context:\n${contextText}`,
          `Question: ${question}`,
          "Answer concisely. Start with the direct answer, then include brief supporting details from the retrieved sources."
        ]
          .filter(Boolean)
          .join("\n\n")
      }
    ],
    {
      maxTokens: 1000,
      temperature: 0.15
    }
  );

  const content = getResponseText(payload);

  if (!content) {
    throw new AppError("OpenRouter returned an empty response.", 502);
  }

  return content;
}
