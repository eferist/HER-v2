# Report: Background Process Visibility in Chat UI

## The Problem

When you send a message in the chat, you only see:
1. Your message
2. A typing indicator (dots)
3. The final response

**What's missing:** You can't see what's happening "behind the scenes" - which tools are being called, what the workflow looks like, whether it's planning, routing, executing, etc.

---

## Current State Analysis

### What the Backend Already Does (Good News!)

The backend **already emits events** at key stages! Looking at `main_loop.py:47-163`:

| Stage | Event Sent | Data Included |
|-------|-----------|---------------|
| Routing | `routing` | message: "Analyzing your request..." |
| Route Done | `routed` | path (direct/agent), reasoning |
| Planning | `planning` | message: "Creating execution plan..." |
| Plan Done | `planned` | mode, subtasks with IDs, tools, dependencies |
| Executing | `executing` | message: "Running tools..." |
| Complete | `complete` | message: "Done" |

### What the Frontend Does (The Problem!)

Looking at `ChatPage.js` and `app.js`:

- `onActivity(event)` is called when backend sends events
- **But `ChatPage.js` has NO `onActivity` handler!** It only handles `onMessage` (final response/error)
- The events are sent to the page, but **completely ignored**

This is why you don't see anything - the "pipe" exists, but nothing displays the data!

---

## The Gap: What's Missing in Execution

Looking at `graph_executor.py`, during tool execution there's only `print()` to terminal:
- `print(f"  → Executing: {subtask.id}")`
- `print(f"  → Executing in parallel: {[s.id for s in ready]}")`

**No events are emitted during execution!** So even if we fix the frontend, you won't know which specific tool is running.

---

## Alternative Solutions (High-Level)

### Option A: "Simple Activity Feed" (Easiest)

**What it looks like:**
A small text area below the typing indicator that shows status messages like:
- "Analyzing request..."
- "Planning: weather lookup"
- "Executing: get_weather tool"
- "Done!"

**How it works:**
1. Add an `onActivity` handler in ChatPage.js
2. Display event messages in a status text element
3. Clear when response arrives

**Pros:** Minimal changes, quick to implement
**Cons:** Basic, just text updates

---

### Option B: "Step Progress Bar" (Medium)

**What it looks like:**
A horizontal progress indicator showing:
```
[Router] → [Planner] → [Executor] → [Done]
   ✓          ✓          ●
```
Each step lights up as it completes.

**How it works:**
1. Create a progress component with 4 stages
2. Map events to stages (routing→Router, planning→Planner, etc.)
3. Highlight current stage, checkmark completed ones

**Pros:** Visual, intuitive
**Cons:** More UI work, needs design

---

### Option C: "Expandable Activity Log" (More Advanced)

**What it looks like:**
A collapsible panel that shows detailed breakdown:
```
▼ Processing Request
  ✓ Route: agent path (needs tools)
  ✓ Plan: 2 subtasks
    • search_web → brave_search
    • format_results → (none)
  ● Execute: search_web running...
```

**How it works:**
1. Create an activity log panel (expandable/collapsible)
2. Append each event as a line item
3. Show subtask details from `planned` event
4. Update with execution progress

**Pros:** Detailed, great for debugging
**Cons:** More complex, needs execution events added to backend

---

### Option D: "Side Panel Activity View" (Most Complete)

**What it looks like:**
A dedicated sidebar/panel that shows:
- Current stage (big indicator)
- Workflow visualization (simple boxes with arrows)
- Tool calls in real-time
- Timing info

**How it works:**
1. Create a new panel component
2. Subscribe to all activity events
3. Build visual workflow from `planned` event data
4. Highlight nodes as they execute

**Pros:** Most informative, professional feel
**Cons:** Significant UI work, needs backend enhancements

---

## Recommended Path Forward

### Phase 1: Quick Win (Option A)
Add basic activity feed to show something is happening. Minimal effort, immediate improvement.

### Phase 2: Backend Enhancement
Add execution-level events in `graph_executor.py`:
- `subtask_start` with subtask ID and tools
- `subtask_complete` with result summary
- `tool_call` when specific MCP tool is invoked (optional)

### Phase 3: Better UI (Option B or C)
Once events are richer, build a proper progress/log view.

---

## Summary Table

| Option | Effort | Visual Impact | Info Depth | Recommendation |
|--------|--------|---------------|------------|----------------|
| A: Simple Feed | Low | Basic | Low | Start here |
| B: Progress Bar | Medium | Good | Medium | Good for most users |
| C: Activity Log | Medium | Good | High | Good for power users |
| D: Side Panel | High | Excellent | Very High | Future goal |

---

## Next Steps

If you want to proceed, let me know which option appeals to you:
1. **"Just show me something!"** → Option A
2. **"I want it to look nice"** → Option B
3. **"I want all the details"** → Option C
4. **"Go big or go home"** → Option D

I'll create a build plan based on your choice!
