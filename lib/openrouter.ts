import { createTtlCache } from "@/lib/cache";
import { AppError } from "@/lib/errors";
import { getOpenRouterConfig } from "@/lib/env";
import { buildAnalysisPrompt } from "@/lib/prompt";
import type { AnalysisResult, RepoContext } from "@/lib/types";
import { extractJsonObject, normalizeAnalysisResult } from "@/lib/utils";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const analysisCache = createTtlCache<AnalysisResult>(1000 * 60 * 10);

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

async function requestAnalysis(repo: RepoContext, repairInstruction?: string) {
  const { apiKey, model, appUrl } = getOpenRouterConfig();
  const baseMessages = [
    {
      role: "system",
      content:
        "You are a practical senior software engineer. Return valid JSON only and stay grounded in the repository files."
    },
    {
      role: "user",
      content: repairInstruction
        ? `${buildAnalysisPrompt(repo)}\n\nAdditional repair instruction:\n${repairInstruction}`
        : buildAnalysisPrompt(repo)
    }
  ];

  for (const useStructuredOutput of [true, false]) {
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
          max_tokens: 2400,
          ...(useStructuredOutput
            ? {
                response_format: {
                  type: "json_object"
                }
              }
            : {}),
          messages: baseMessages
        })
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new AppError("The model took too long to respond. Try a smaller repo or try again.", 504);
      }

      throw error;
    }

    const rawText = await response.text();
    let payload: OpenRouterResponse | null = null;

    try {
      payload = JSON.parse(rawText) as OpenRouterResponse;
    } catch {
      if (useStructuredOutput) {
        continue;
      }

      throw new AppError("OpenRouter returned a non-JSON response.", 502);
    }

    if (!response.ok) {
      throw new AppError(payload.error?.message || "OpenRouter request failed.", response.status);
    }

    return payload;
  }

  throw new AppError("OpenRouter request failed.", 502);
}

export async function analyzeRepository(repo: RepoContext): Promise<AnalysisResult> {
  const cacheKey = `${repo.owner}/${repo.name}:${repo.defaultBranch}`;
  const cached = analysisCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  let payload = await requestAnalysis(repo);
  let content = getResponseText(payload);

  if (!content) {
    throw new AppError("OpenRouter returned an empty response.", 502);
  }

  let normalized: AnalysisResult;

  try {
    const jsonText = extractJsonObject(content);
    normalized = normalizeAnalysisResult(JSON.parse(jsonText));
  } catch {
    payload = await requestAnalysis(
      repo,
      "Your previous reply was not valid JSON. Return only a single valid JSON object matching the schema."
    );
    content = getResponseText(payload);

    if (!content) {
      throw new AppError("OpenRouter returned an empty response.", 502);
    }

    const jsonText = extractJsonObject(content);
    normalized = normalizeAnalysisResult(JSON.parse(jsonText));
  }

  analysisCache.set(cacheKey, normalized);

  return normalized;
}
