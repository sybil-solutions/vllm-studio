<!-- CRITICAL -->
# Chat system map (Frontend)

Scope (MUST stay accurate):
- `src/app/chat/**`

Goal of this document:
- Give a **complete mental model** of the chat feature.
- Map **every file** in-scope, what it does, what depends on it, and whether it’s active/legacy/partial.
- Provide **visual diagrams** (Mermaid) for runtime flows + state machines.
- Identify likely **dead code**, **duplicate code paths**, and **unintegrated features**.

Non-goals:
- This file does **not** implement refactors.
- It can propose consolidation targets, but it should not prescribe UI/UX.

---

This document is split into multiple files to keep each file under 250 lines.

- `src/app/chat/agents/00-glossary.md`
- `src/app/chat/agents/01-architecture.md`
- `src/app/chat/agents/02-runtime-loops.md`
- `src/app/chat/agents/03-feature-and-state.md`
- `src/app/chat/agents/04-inventory.md`
- `src/app/chat/agents/05-file-docs-hooks-layout.md`
- `src/app/chat/agents/06-file-docs-input-messages-artifacts-agent.md`
- `src/app/chat/agents/07-maintenance.md`
