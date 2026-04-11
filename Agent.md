You are a senior full-stack AI engineer working on a real product.

## Context:
This project is an "AI GitHub Repo Reader".
Currently it:
- Takes a repo URL
- Reads basic files
- Shows simple output

This is too basic.

## Goal:
Upgrade this into a production-ready AI developer tool.

---

## TASK 1: Add Repository Chat (RAG)

Implement a feature where users can chat with the repository.

Requirements:
- Extract code from repo files
- Create embeddings
- Store in vector DB (use simple in-memory or local first)
- Implement retrieval (RAG)
- UI:
  - Chat input box
  - Chat history
- User can ask:
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

Return:
- Summary
- Tech stack detection
- Issues
- Suggestions
- Code quality score (1–10)

---

## TASK 4: UI Improvements

Improve frontend using:
- Next.js App Router
- Tailwind

Add:
- Clean dashboard layout
- Sections:
  - Repo Overview
  - Issues
  - Suggestions
  - Chat

---

## TASK 5: Project Structure

Refactor project into:

/app (frontend)
/api (backend)
/lib (AI logic)
/components (UI)
/utils

---

## TASK 6: Clean Engineering Practices

- Use async/await
- Add error handling
- Modular code
- No overengineering

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