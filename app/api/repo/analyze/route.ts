import { NextResponse } from "next/server";

import { analyzeRepository } from "@/lib/analysis";
import { isAppError } from "@/lib/errors";
import { getRepoContext } from "@/lib/github";
import type { RepoAnalysisResponse } from "@/lib/types";

type AnalyzeRequestBody = {
  repoUrl?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeRequestBody;
    const repoUrl = body.repoUrl?.trim();

    if (!repoUrl) {
      return NextResponse.json({ error: "Repository URL is required." }, { status: 400 });
    }

    const repo = await getRepoContext(repoUrl);
    const analysis = await analyzeRepository(repo);
    const payload: RepoAnalysisResponse = { analysis };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyze the repository.";
    const status = isAppError(error) ? error.statusCode : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
