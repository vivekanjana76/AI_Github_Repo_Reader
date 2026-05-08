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
- NextAuth (credentials auth)
- Prisma + SQLite
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
DATABASE_URL=file:./dev.db
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace_with_a_long_random_secret
```

`GITHUB_TOKEN` is optional, but helps avoid GitHub rate limits.

3. Initialize the database:

```bash
npx prisma migrate dev --name init_auth
```

4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`

## How it works

1. The UI accepts a public GitHub repository URL.
2. The server fetches repository metadata and the git tree.
3. Important text files are prioritized and downloaded.
4. A structured prompt is sent to OpenRouter.
5. The response is normalized into sections for the UI.

## Authentication flow

- `POST /api/auth/signup` creates users with `bcrypt` password hashing.
- NextAuth credentials login is mounted at `app/api/auth/[...nextauth]/route.ts`.
- Protected routes: `/dashboard`, `/chat`, `/analysis`.
- Unauthenticated users are redirected to `/login`.

## Docker (Task 8)

This project is container-ready with:

- multi-stage production `Dockerfile`
- one-shot Prisma migration service
- persistent SQLite volume for user data

### Run with Docker Compose

1. Create Docker env file:

```bash
# macOS/Linux
cp .env.docker.example .env.local

# Windows PowerShell
Copy-Item .env.docker.example .env.local
```

2. Start the stack:

```bash
docker compose up --build
```

3. Open `http://localhost:3000`

### What Compose does

- `migrate` service runs `prisma migrate deploy`
- `ai-engineer-app` starts only after migrations succeed
- SQLite DB is stored in volume `app_data` at `/data/dev.db`

## Notes

- The app uses a simple in-memory TTL cache for repository context and analysis results.
- Large repos are sampled rather than fully cloned.
- Only public GitHub repositories are supported in this version.
