import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { getRepoContext } from "@/lib/github";
import type { RepoLoadResponse } from "@/lib/types";
import { authOptions } from "@/lib/auth";
import { AppError } from "@/utils/errors";
import { buildRepoTree } from "@/utils/helpers";
import { createErrorResponse, parseJsonBody, requireTrimmedString } from "@/utils/http";

type LoadRequestBody = {
  repoUrl?: string;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      throw new AppError("You must be signed in to load repositories.", 401);
    }

    const body = await parseJsonBody<LoadRequestBody>(request);
    const repoUrl = requireTrimmedString(body.repoUrl, "Repository URL is required.");

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
    return createErrorResponse(error, "Unable to load repository.");
  }
}
