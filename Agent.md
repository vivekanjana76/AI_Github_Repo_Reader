You are a senior AI software engineer building a production-ready application.

## Goal:
Build an AI Software Engineer Agent that can analyze a GitHub repository, understand the codebase, and suggest improvements, refactors, and bug fixes.

## Tech Stack:
- Frontend: Next.js (App Router) + Tailwind CSS
- Backend: Node.js (API routes or Express)
- AI: OpenAI API (or compatible)
- Optional: LangChain or simple agent loop
- GitHub API integration

## Core Features:

1. Repository Input:
- User enters a GitHub repo URL
- Fetch repo files using GitHub API
- Focus on important files (README, src/, package.json)

2. Code Understanding:
- Parse and summarize:
  - Project purpose
  - Tech stack
  - Folder structure
- Identify key modules and logic

3. AI Agent Capabilities:
- Suggest improvements:
  - Code quality issues
  - Performance optimizations
  - Best practices
- Detect potential bugs or bad patterns
- Suggest refactored code snippets

4. Output:
- Structured response:
  - Summary
  - Issues found
  - Suggested fixes
  - Improved code snippets

5. UI:
- Input field for repo URL
- Button: "Analyze Repo"
- Sections:
  - Summary
  - Issues
  - Suggestions

## Requirements:
- Clean and modular code structure
- Use async/await properly
- Error handling for API failures
- Do NOT overcomplicate architecture
- Keep it beginner-friendly but scalable

## Output format:
- Generate full working project structure
- Include:
  - Folder structure
  - Key files with code
  - API routes
  - Frontend pages/components

## Bonus (if possible):
- Add “Generate PR-style diff” feature
- Add loading states in UI
- Add simple caching for repo data

## Important:
- Think step-by-step before coding
- Prefer clarity over cleverness
- Write production-quality code, not demo code