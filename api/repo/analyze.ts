import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { analyzeRepository } from "@/lib/analysis";
import { authOptions } from "@/lib/auth";
import { getRepoContext } from "@/lib/github";
import type { RepoAnalysisResponse } from "@/lib/types";
import { AppError } from "@/utils/errors";
import { createErrorResponse, parseJsonBody, requireTrimmedString } from "@/utils/http";

type AnalyzeRequestBody = {
  repoUrl?: string;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      throw new AppError("You must be signed in to analyze repositories.", 401);
    }

    const body = await parseJsonBody<AnalyzeRequestBody>(request);
    const repoUrl = requireTrimmedString(body.repoUrl, "Repository URL is required.");

    const repo = await getRepoContext(repoUrl);
    const analysis = await analyzeRepository(repo);
    const payload: RepoAnalysisResponse = { analysis };

    return NextResponse.json(payload);
  } catch (error) {
    return createErrorResponse(error, "Unable to analyze the repository.");
  }
}
