import { NextResponse } from "next/server";

import { isAppError } from "@/lib/errors";
import { getRepoContext } from "@/lib/github";
import type { RepoLoadResponse } from "@/lib/types";
import { buildRepoTree } from "@/lib/utils";

type LoadRequestBody = {
  repoUrl?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoadRequestBody;
    const repoUrl = body.repoUrl?.trim();

    if (!repoUrl) {
      return NextResponse.json({ error: "Repository URL is required." }, { status: 400 });
    }

    const repo = await getRepoContext(repoUrl);
    const payload: RepoLoadResponse = {
      repo: {
        repoUrl: repo.repoUrl,
        owner: repo.owner,
        name: repo.name,
        defaultBranch: repo.defaultBranch,
        description: repo.description,
        fileCount: repo.fileCount,
        analyzedFiles: repo.selectedFiles.map((file) => file.path),
        dominantDirectories: repo.dominantDirectories,
        fileTree: buildRepoTree(repo.treeEntries)
      }
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load repository.";
    const status = isAppError(error) ? error.statusCode : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
