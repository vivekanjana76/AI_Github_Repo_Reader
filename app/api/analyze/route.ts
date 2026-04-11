import { NextResponse } from "next/server";

import { isAppError } from "@/lib/errors";
import { getRepoContext } from "@/lib/github";
import { analyzeRepository } from "@/lib/openrouter";

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

    return NextResponse.json({
      repo: {
        owner: repo.owner,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        description: repo.description,
        fileCount: repo.fileCount,
        analyzedFiles: repo.selectedFiles.map((file) => file.path),
        dominantDirectories: repo.dominantDirectories
      },
      analysis
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Something went wrong while analyzing the repository.";
    const status = isAppError(error) ? error.statusCode : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
