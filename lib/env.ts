import { AppError } from "@/lib/errors";

export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new AppError("Missing OPENROUTER_API_KEY. Add it to your environment before analyzing.", 500);
  }

  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4.1-mini",
    appUrl: process.env.APP_URL?.trim() || "http://localhost:3000"
  };
}

