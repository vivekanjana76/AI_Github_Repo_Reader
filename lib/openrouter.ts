import { createTtlCache } from "@/lib/cache";
import { buildAnalysisPrompt } from "@/lib/prompt";
import type { AnalysisResult, RepoContext } from "@/lib/types";
import { extractJsonObject, normalizeAnalysisResult } from "@/lib/utils";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const analysisCache = createTtlCache<AnalysisResult>(1000 * 60 * 10);

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export async function analyzeRepository(repo: RepoContext): Promise<AnalysisResult> {
  const cacheKey = `${repo.owner}/${repo.name}`;
  const cached = analysisCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY. Add it to your environment before analyzing.");
  }

  const model = process.env.OPENROUTER_MODEL || "openrouter/free";
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
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
      messages: [
        {
          role: "system",
          content:
            "You are a practical senior software engineer. Return valid JSON only and stay grounded in the repository files."
        },
        {
          role: "user",
          content: buildAnalysisPrompt(repo)
        }
      ]
    })
  });

  const payload = (await response.json()) as OpenRouterResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || "OpenRouter request failed.");
  }

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  const jsonText = extractJsonObject(content);
  const normalized = normalizeAnalysisResult(JSON.parse(jsonText));

  analysisCache.set(cacheKey, normalized);

  return normalized;
}

