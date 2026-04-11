# AI Engineer Agent

A beginner-friendly Next.js app that reviews a public GitHub repository and returns:

- a project summary
- likely issues and risks
- practical improvement suggestions
- optional code snippets and a PR-style diff

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- GitHub REST API
- OpenRouter-compatible chat completions API

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env.local`:

```bash
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openrouter/free
GITHUB_TOKEN=
APP_URL=http://localhost:3000
```

`GITHUB_TOKEN` is optional, but helps avoid GitHub rate limits.

3. Start the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`

## How it works

1. The UI accepts a public GitHub repository URL.
2. The server fetches repository metadata and the git tree.
3. Important text files are prioritized and downloaded.
4. A structured prompt is sent to OpenRouter.
5. The response is normalized into sections for the UI.

## Notes

- The app uses a simple in-memory TTL cache for repository context and analysis results.
- Large repos are sampled rather than fully cloned.
- Only public GitHub repositories are supported in this version.
