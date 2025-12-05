# Build Plan: Simple Activity Feed

## Goal

Show real-time status updates in the chat UI so users can see what's happening behind the scenes (routing, planning, executing, etc.) instead of just seeing a typing indicator.

---

## What You'll Get

When you send a message, instead of just dots, you'll see:

```
[Analyzing request...]
[Route: using tools]
[Planning: 2 subtasks - brave_search, format_results]
[Executing: running tools...]
[Done!]
```

Then the final response appears.

---

## Changes Overview

| File | What Changes |
|------|-------------|
| `frontend/css/components/status.css` | Add styles for activity feed text |
| `frontend/js/pages/ChatPage.js` | Add `onActivity` handler to display events |
| `backend/src/engine/main_loop.py` | (Minor) Clean up event messages for better display |
| `backend/src/orchestration/graph_executor.py` | Add events when subtasks start/complete |

---

## Step-by-Step Implementation

### Step 1: Add CSS for Activity Feed

**File:** `frontend/css/components/status.css`

Add new styles for the activity text that appears above the typing indicator. Should be:
- Smaller font than chat messages
- Muted color (not too attention-grabbing)
- Subtle fade-in animation

---

### Step 2: Update ChatPage.js

**File:** `frontend/js/pages/ChatPage.js`

Changes needed:
1. Add a new element to display activity status (above typing indicator)
2. Implement `onActivity(event)` method to handle incoming events
3. Map event types to user-friendly messages:
   - `routing` → "Analyzing request..."
   - `routed` → "Route: [path]"
   - `planning` → "Planning..."
   - `planned` → "Plan: [X] subtasks"
   - `executing` → "Executing..."
   - `subtask_start` → "Running: [subtask_id]"
   - `subtask_complete` → "Done: [subtask_id]"
   - `complete` → Clear the activity feed
4. Clear activity feed when final response arrives

---

### Step 3: Enhance Backend Events

**File:** `backend/src/orchestration/graph_executor.py`

Add event emissions during execution:
1. Accept `on_event` callback parameter in `execute()` function
2. Emit `subtask_start` when a subtask begins
3. Emit `subtask_complete` when a subtask finishes

**File:** `backend/src/engine/main_loop.py`

1. Pass `on_event` callback to the `execute()` function
2. Make event messages more user-friendly (less technical)

---

### Step 4: Wire It Up

**File:** `backend/src/api/web.py`

The WebSocket handler already broadcasts activity events - no changes needed here! Events will automatically flow through once backend emits them.

---

## Event Flow Diagram

```
User sends message
       │
       ▼
┌─────────────────┐
│ Backend: route()│ ──emit──▶ {event: "routing"}
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Backend: plan() │ ──emit──▶ {event: "planned", subtasks: [...]}
└────────┬────────┘
         │
         ▼
┌──────────────────┐
│Backend: execute()│ ──emit──▶ {event: "subtask_start", id: "search"}
│                  │ ──emit──▶ {event: "subtask_complete", id: "search"}
└────────┬─────────┘
         │
         ▼
┌─────────────────┐
│ Final response  │ ──emit──▶ {type: "response", content: "..."}
└─────────────────┘
         │
         ▼
   Frontend: ChatPage
   - onActivity() updates status text
   - onMessage() shows final response & clears status
```

---

## Files to Touch (Summary)

1. `frontend/css/components/status.css` - New styles
2. `frontend/js/pages/ChatPage.js` - Add onActivity handler
3. `backend/src/orchestration/graph_executor.py` - Add subtask events
4. `backend/src/engine/main_loop.py` - Pass callback to executor

---

## Success Criteria

After implementation:
- [ ] Sending a message shows status updates in real-time
- [ ] Each orchestration stage displays a message
- [ ] Activity feed clears when response arrives
- [ ] No errors in browser console
- [ ] Works for both "direct" and "agent" paths

---

## Ready to Build?

Say `/build PLAN_simple_activity_feed.md` to start implementation!
