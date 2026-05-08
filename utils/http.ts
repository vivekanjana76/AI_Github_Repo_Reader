import { NextResponse } from "next/server";

import { AppError, isAppError } from "@/utils/errors";

export async function parseJsonBody<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AppError("Request body must be valid JSON.", 400);
  }
}

export function requireTrimmedString(value: string | undefined, message: string) {
  const trimmed = value?.trim();

  if (!trimmed) {
    throw new AppError(message, 400);
  }

  return trimmed;
}

export function createErrorResponse(error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : fallbackMessage;
  const status = isAppError(error) ? error.statusCode : 500;

  return NextResponse.json({ error: message }, { status });
}

