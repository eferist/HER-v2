# The JIT Orchestrator: Refactoring Constitution

This document defines the core architectural philosophy of our project. It is the single source of truth for *how* our codebase should be structured. All refactoring efforts must align with these principles.

## The Team & The Philosophy

We are a team of three "Vibe Coders" who prioritize speed, intuition, and modularity. Our goal is to build a platform that is easy to understand, work on in parallel, and extend without fear.

-   **Ahimsa:** The Orchestration Engine (The "Brain")
-   **Risang:** The Context & Memory System (The "Memory")
-   **Noel:** The Tools & Interfaces (The "Hands & Face")

## Principle 1: The Sandbox - Organize by Owner

The codebase is structured by **human ownership**, not just by function. Each team member has a "sandbox" to prevent collisions and enable parallel work.

-   **`src/orchestration/` (Ahimsa's Sandbox):** This is the "Think & Do" loop. It contains the `Router`, `Planner`, `Executor`, and `Synthesizer`. No tool or memory logic should ever exist here.
-   **`src/context/` (Risang's Sandbox):** This is the "Memory." It contains the `SessionManager` and all future state/context systems like Cognee. It is a self-contained module for managing conversational history and knowledge.
-   **`src/tools/` & `src/api/` (Noel's Sandbox):** This is the "Hands & Face." `tools/` handles all interaction with the outside world (MCP). `api/` handles all interaction with the user (Terminal, Web).

**Golden Rule:** When refactoring, respect these boundaries. Never move code from one owner's sandbox into another's.

## Principle 2: The Headless Engine - Separate Logic from UI

The core application must be completely "headless," meaning its logic is totally separate from how it is presented to the user.

-   **`src/engine/`:** This is the central, reusable "Engine." It contains the main orchestration loop that stitches together the work of all three team members. It must contain **zero** UI-specific code (no `print`, no `input`, no Streamlit widgets).
-   **`src/api/`:** This is the "Dashboard." It is a thin, disposable layer that calls the engine. The `terminal.py` file is one such dashboard. A future `web.py` would be another.

**Golden Rule:** The engine must be able to run without a user interface. The interface must contain no core business logic.

## Principle 3: The Utilitarian Mandate - Refactor with Purpose

We are pragmatic. We refactor to solve a problem or enable a new feature, not just to make things "perfect."

-   **If it ain't broke, don't fix it.** Do not refactor a piece of code that is working and understandable just for the sake of it.
-   **Clarity over cleverness.** Code should be written to be understood by the rest of the team in 5 seconds.
-   **Refactor to enable, not to polish.** The primary reason to refactor is to make a future task (like adding a new tool or swapping the memory system) easier and safer.

---

### **Instructions for AI Partner**

Before initiating any refactoring task, you **must** read and adhere to the three principles outlined in this document. Your proposed changes must be explicitly justified against these rules.