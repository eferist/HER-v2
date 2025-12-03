# ARCHITECTURAL DNA

**Purpose**: This document captures the behavioral essence, design principles, and logic flows of the JIT Orchestrator system. It is written for architects who need to rebuild this system in a different language or with different infrastructure—without ever seeing the original code.

---

## Table of Contents

1. [The Decision Engine (Routing)](#1-the-decision-engine-routing)
2. [The Planning Philosophy](#2-the-planning-philosophy)
3. [The Execution Strategy](#3-the-execution-strategy)
4. [The Tool Interface (The Interface Gap)](#4-the-tool-interface-the-interface-gap)

---

## 1. The Decision Engine (Routing)

### The Core Question

Every incoming request must answer one question first: **"Can I answer this directly, or do I need to take action?"**

This is the Router's sole responsibility.

### The Two Paths

| Path | Trigger | Behavior |
|------|---------|----------|
| **Direct** | Greetings, casual chat, simple knowledge questions | Respond immediately without tools |
| **Agent** | Anything requiring live data, tools, or multi-step work | Spawn agents to handle the request |

### The Decision Heuristics

The Router uses an LLM to classify requests, but the classification principles are:

**Direct Path (no tools needed):**
- Social pleasantries: "Hi", "Thanks", "How are you?"
- Pure knowledge queries: "What is the capital of France?"
- Clarifications about previous responses
- Requests that can be answered from conversation context alone

**Agent Path (tools needed):**
- Requests for *current* information: "What's the weather in Tokyo?"
- Actions that affect external systems: "Send a message to John"
- Multi-step tasks: "Search for X, then do Y with the result"
- Anything that requires data the LLM cannot possess (live prices, real-time data)

### Context Augmentation

The Router doesn't see the request in isolation. It receives:

1. **Session Context**: Recent conversation history (token-limited sliding window)
2. **Long-term Memory**: Extracted facts about this user from previous sessions

This allows the Router to understand requests like "Send that to my team" (requires knowing what "that" refers to and who "my team" is).

### Resilience Pattern

The Router has a model chain fallback. If the primary model fails, it tries secondary models. If all fail, it defaults to a safe "direct" response acknowledging the issue.

**Principle**: The system should never crash on routing failure. A degraded response is better than no response.

---

## 2. The Planning Philosophy

### The Core Concept: Execution Plans

When the Router sends a request down the Agent path, the system must decide **how** to accomplish the task. This is the Planner's job.

The Planner transforms a natural language request into an **Execution Plan**—a structured representation of what needs to happen.

### The Anatomy of an Execution Plan

An Execution Plan contains:

1. **Execution Mode**: How the work should be organized (single, parallel, or sequential)
2. **Subtasks**: The individual units of work to be performed

Each **Subtask** contains:

| Component | Purpose |
|-----------|---------|
| **ID** | Unique identifier (verb_noun format, e.g., `search_weather`) |
| **Blueprint** | Instructions for spawning an agent (name, tools needed, system instructions) |
| **Dependencies** | List of subtask IDs this task depends on (for sequential mode) |

### The Blueprint Abstraction

A **Blueprint** is a recipe for creating an agent. It contains:

- **Agent Name**: A descriptive name for logging and debugging
- **Tools Required**: List of tool names this agent needs access to
- **System Instructions**: Detailed instructions for how the agent should behave

**Key Insight**: The Blueprint does not contain code or implementation details. It's a *specification* that any agent factory can consume.

### Decomposition Patterns

The Planner recognizes three patterns:

#### Pattern 1: Single Task
Most requests fall here. One subtask, one agent, one execution.

*Example*: "What's the weather in Tokyo?"
- One subtask: `get_weather`
- One tool: weather API
- Direct execution → response

#### Pattern 2: Parallel Tasks
Independent tasks that share no dependencies.

*Example*: "Compare NVDA and TSLA stock prices"
- Two subtasks: `search_nvda`, `search_tsla`
- No dependencies between them
- Execute simultaneously → synthesize results

#### Pattern 3: Sequential Tasks
Tasks where later steps depend on earlier results.

*Example*: "Get the weather in Tokyo and send it to my Telegram"
- Two subtasks: `get_weather` → `send_telegram`
- Second depends on first's result
- Execute in order, passing context forward

### The Planner's Intelligence

The Planner is an LLM with:

1. **Tool Registry Knowledge**: It knows what tools exist and what they do
2. **Few-shot Examples**: It has seen examples of good decomposition
3. **Validation Rules**: Its output must be valid JSON with real tool names

**Validation Pipeline**:
- Every tool in `tools_required` must exist in the registry
- Every `depends_on` reference must point to a real subtask ID
- Circular dependencies are rejected

### Fallback Philosophy

If planning fails (invalid JSON, unknown tools, all retries exhausted), the system doesn't crash. It falls back to a **no-tools agent** that can at least acknowledge the request and explain the limitation.

---

## 3. The Execution Strategy

### The Strategy Pattern

The system uses a **factory** to select the right executor based on the execution mode:

```
Execution Plan → Factory → Executor (Single | Parallel | Sequential)
```

All executors share a common interface, but their internal logic differs.

### Single Execution

**Mental Model**: One agent, one task, one response.

**Flow**:
1. Extract the single subtask from the plan
2. Spawn an agent using the subtask's blueprint
3. Let the agent execute with its assigned tools
4. Synthesize the result into a natural response
5. Return

**Behavioral Principle**: Agents are instructed to complete their task in **one tool call**. No "let me search again" or "let me verify." If information is missing, say so and move on.

### Parallel Execution

**Mental Model**: Multiple independent agents racing to finish, results combined at the end.

**Flow**:
1. Spawn all agents simultaneously
2. Execute all tasks concurrently (no waiting between them)
3. Collect all results into a dictionary: `{subtask_id → result}`
4. Pass all results to a **Response Synthesizer**
5. Return unified response

**Exception Handling**: One failure doesn't stop others. Failed subtasks are marked with their error, and the synthesizer handles partial results gracefully.

### Sequential Execution

**Mental Model**: A pipeline where each stage can use the output of previous stages.

**Flow**:
1. Determine execution order using dependency analysis (topological sort)
2. Group subtasks into "batches"—tasks in the same batch have their dependencies satisfied and can run in parallel
3. Execute batch by batch:
   - If batch has one task: execute directly
   - If batch has multiple tasks: execute them in parallel
4. Pass results forward: inject previous outputs into dependent tasks' instructions
5. Return final subtask's result (or synthesized result if multiple endpoints)

**Context Passing Mechanism**:
- When subtask B depends on subtask A, B's system instructions are augmented with: `"[Result from A]: {A's output}"`
- This is **instruction injection**, not code-level dependency resolution
- The dependent agent reads context the same way a human would

### The Response Synthesizer

All multi-task paths end with synthesis. The Synthesizer is a specialized agent that:

- Receives all raw results + the original request
- Produces one coherent natural language response
- Writes as if it personally gathered all the information
- Avoids mechanical lists or task-by-task breakdowns

**Principle**: The user asked one question. They should get one answer, not a report of what each subtask did.

---

## 4. The Tool Interface (The Interface Gap)

### The Orchestrator's Expectations

The Orchestrator doesn't know how tools work internally. It only knows:

1. **Tool Names**: String identifiers (e.g., `"duckduckgo"`, `"telegram"`)
2. **Tool Descriptions**: Human-readable text explaining what the tool does
3. **Tool Instances**: Opaque objects that can be passed to agents

### The Tool Registry Pattern

Tools are registered in a central registry with this structure:

| Key | Value |
|-----|-------|
| Name (string) | Factory function + Description |

**Two-Phase Resolution**:

1. **Planning Phase**: The Planner sees tool descriptions to decide which tools a subtask needs
2. **Execution Phase**: Tool names are resolved to actual instances via factory functions

**Why Factories?**: Tools may have expensive initialization (API clients, auth tokens). Lazy loading via factories prevents unnecessary overhead.

### The Contract Between Orchestrator and Tools

The Orchestrator expects tools to:

1. **Be Self-Contained**: A tool should not require orchestrator internals to function
2. **Be Stateless**: Multiple agents might use the same tool type simultaneously
3. **Have Clear Methods**: The underlying agent framework dispatches to tool methods based on LLM reasoning
4. **Return Results, Not Side Effects**: Tools should return data that can be logged, synthesized, and passed to dependent tasks

### The Interface Gap (For MCP Migration)

When migrating to MCP (Model Context Protocol), the adapter must bridge these expectations:

| Orchestrator Expects | MCP Must Provide |
|---------------------|------------------|
| Tool name → description mapping | MCP tool discovery → registry format |
| Factory function returning tool instance | MCP client wrapper as tool instance |
| Tool methods callable by agent framework | MCP request/response translated to method calls |
| String results for synthesis | MCP responses converted to strings |

**The Adapter's Job**:
1. Translate MCP's tool discovery into the registry format
2. Wrap MCP calls in objects that look like local tools to the agent framework
3. Handle MCP's async/streaming nature transparently
4. Maintain the "one tool call" philosophy in agent instructions

### Tool Categories

The system recognizes two conceptual categories:

**API Tools** (external services):
- Weather APIs, search engines, web fetchers
- Stateless, can be called freely

**Account Tools** (user's authenticated services):
- Messaging apps, calendars, schedulers
- Require user identity, may have rate limits
- Often need preliminary steps (e.g., search for contact before messaging)

The Planner is trained to understand these distinctions through examples.

---

## Appendix: Core Design Principles

### 1. Fail-Safe Degradation
Every component has a fallback. Router failure → safe response. Planner failure → no-tools agent. Subtask failure → continue others.

### 2. Single Tool Call Philosophy
Agents complete tasks in one tool call. No retrying, no "let me verify." This prevents runaway loops and keeps costs predictable.

### 3. Instruction Injection Over Code Coupling
Dependencies pass context via natural language instructions, not function parameters. This keeps the system flexible and debuggable.

### 4. Model Chain Isolation
Each component (Router, Planner, Agent, Synthesizer) has its own model chain. One component's failure doesn't cascade to others.

### 5. Just-In-Time Everything
No predefined workflows. Routing, decomposition, and execution strategy are all decided at runtime based on the specific request.

### 6. Context is King
Session memory + long-term memory + conversation context are threaded through every decision point. The system should "remember" like a good assistant would.

---

## Conclusion

This system's essence is **deferred intelligence**. Rather than hardcoding flows, it uses LLMs at each decision point to adapt to the request at hand. The architecture provides the structure; the LLMs provide the judgment.

A successful reimplementation must preserve:
- The Router's binary classification ability
- The Planner's decomposition intelligence
- The Executor's mode-specific behaviors
- The Tool Registry's abstraction layer

Everything else—languages, frameworks, infrastructure—is implementation detail.
