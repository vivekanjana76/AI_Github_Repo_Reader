You are a senior full-stack AI engineer working on a real product.

## Context:
This project is an "AI GitHub Repo Reader".
Currently it:
- Takes a repo URL
- Reads basic files
- Shows simple output

This is too basic.

## Goal:
Upgrade this into a production-ready AI developer tool with authentication, AI-powered analysis, and interactive features.

---

## TASK 0: Authentication (NEW - HIGH PRIORITY)

Implement a secure authentication system.

### Requirements:
- Add Login & Signup functionality
- Use NextAuth (preferred) or JWT-based auth
- Support:
  - Email/password login
  - (Optional) GitHub OAuth

### UI:
- Create `/login` page
- Create `/signup` page (optional)
- Clean, minimal UI with Tailwind

### Behavior:
- After login → redirect to main dashboard
- Protect routes:
  - `/dashboard` (main app)
  - `/chat`
  - `/analysis`

### Backend:
- Store users in database (MongoDB / Prisma)
- Hash passwords securely (bcrypt)

---

## TASK 1: Add Repository Chat (RAG)

Implement a feature where users can chat with the repository.

### Requirements:
- Extract code from repo files
- Chunk and preprocess content
- Create embeddings
- Store in vector DB (start with in-memory, upgrade later)
- Implement retrieval (RAG)

### UI:
- Chat input box
- Chat history
- Streaming responses (optional)

### User Queries:
- “Explain this project”
- “Where is authentication handled?”
- “What does this function do?”

---

## TASK 2: Add File Tree UI

- Show repo structure like VS Code sidebar
- Highlight:
  - Important files (README, package.json)
  - Problematic files (large / complex)

---

## TASK 3: Code Analysis Engine

Enhance backend to return structured output:

### Return:
- Summary
- Tech stack detection
- Issues
- Suggestions
- Code quality score (1–10)

---

## TASK 4: UI Improvements

Improve frontend using:
- Next.js App Router
- Tailwind CSS

### Add:
- Clean dashboard layout
- Sidebar (navigation)
- Sections:
  - Repo Overview
  - Issues
  - Suggestions
  - Chat

---

## TASK 5: Project Structure

Refactor project into:

/app (frontend + routes)
/api (backend routes)
/lib (AI logic, RAG, embeddings)
/components (UI components)
/utils (helpers)
/db (database config)

---

## TASK 6: Database Integration

Add database support (MongoDB / Prisma).

### Store:
- User data (auth)
- Repo URLs
- Analysis results
- Chat history

---

## TASK 7: Clean Engineering Practices

- Use async/await
- Add proper error handling
- Modular architecture
- Environment variables for secrets
- No overengineering

---

## TASK 8: DevOps & Deployment (IMPORTANT)

- Dockerize the application
- Create Dockerfile
- Ensure app runs via container

### Bonus:
- Add docker-compose (optional)
- Prepare for deployment (Vercel / Render)

---

## OUTPUT FORMAT:

1. Show updated folder structure
2. Provide key files with code
3. Explain how features connect
4. Keep it clean and production-ready

---

## IMPORTANT:

- Do NOT build everything at once blindly
- First design architecture
- Then implement step-by-step
- Prefer clarity over complexity