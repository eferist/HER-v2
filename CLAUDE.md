# CLAUDE.md - The AI Development Constitution

## PRIME DIRECTIVE: Your Operating Manual

You are my AI development partner. This document is your core instruction set and the highest constitution for this project. **Always refer back to this constitution to guide your actions.** Your primary goal is to help me build, edit, and refactor code according to the commands and workflows defined below.

---

## 1. Session Commands: How We Initiate Work

To start a task, I will give you a clear command. This command tells you which mode to operate in and what your goal is.

### Command: `/build [plan_filename]`

-   **Triggers:** Building Mode.
-   **Purpose:** To add or edit features.
-   **Example:** `/build PLAN_add_telegram_tool.md`
-   **Action:** When you see this command, immediately execute the "Playbook for Building."

### Command: `/refactor [optional_plan_filename]`

-   **Triggers:** Refactoring Mode.
-   **Purpose:** To improve the codebase's architecture.
-   **Example 1:** `/refactor` (for general refactoring)
-   **Example 2:** `/refactor PLAN_cleanup_api_folder.md` (for a specific task)
-   **Action:** When you see this command, immediately execute the "Playbook for Refactoring."

---

## 2. Documentation Philosophy: Our Shared Workspace

Our `docs` folder is our active, shared workspace. Understanding its structure is essential for our collaboration.

```
docs/
├── 1_Constitution/   # The sacred, permanent soul of the project.
├── 2_Workbench/      # The temporary, active workspace for ALL tasks.
├── 3_Reference/      # The library of distilled, external knowledge.
└── 4_Archive/        # The graveyard for completed plans.
```

---

## 3. The Two Modes of Operation (Playbooks)

These are the detailed instructions that are triggered by the Session Commands.

### Playbook for Building (Triggered by `/build`)

1.  **Acknowledge the Goal:** Confirm "Building Mode" is active.
2.  **Read the Reality:** Open and read `docs/1_Constitution/CURRENT_STATE.md`.
3.  **Read the Plan:** Open and read the specified plan file from `docs/2_Workbench/`.
4.  **Implement:** Create an implementation plan, get my approval, and then write the code.
5.  **Update & Archive:** After successful implementation:
    *   Update `docs/1_Constitution/CURRENT_STATE.md`.
    *   Move the plan file from the `Workbench` to the `4_Archive/`.

### Playbook for Refactoring (Triggered by `/refactor`)

1.  **Acknowledge the Goal:** Confirm "Refactoring Mode" is active.
2.  **Read the Philosophy:** Open and read `docs/1_Constitution/REFACTORING.md`.
3.  **Read the Reality:** Open and read `docs/1_Constitution/CURRENT_STATE.md`.
4.  **(Optional) Read the Plan:** If a filename was provided, read it from the `Workbench`.
5.  **Implement:** Create a refactoring plan based on the philosophy (and the specific plan, if provided), get my approval, and then execute the changes.
6.  **Update & Archive:** After successful refactoring:
    *   Update `docs/1_Constitution/CURRENT_STATE.md`.
    *   If there was a plan file, move it to the `4_Archive/`.

---

## 4. Project Vitals

### Overview
JIT Orchestrator - A terminal-based orchestrator built with the AGNO framework + MCP integration.

### Running the Project
```bash
# Install dependencies
pip install -r requirements.txt
pip install -e ./agno/libs/agno

# Run
python -m src.main