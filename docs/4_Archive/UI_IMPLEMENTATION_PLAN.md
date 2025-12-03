# UI Implementation Plan: HER-Inspired Web Interface

## Overview

Transform the JIT Orchestrator from terminal-only to a beautiful HER-inspired web interface. The UI features a warm coral gradient aesthetic with three main views: **Chat**, **Memory**, and **Voice Mode**.

## UI Features Summary (from Reference)

| Feature | Description | Priority |
|---------|-------------|----------|
| Chat Interface | Message bubbles, warm gradient background, input area | P0 - Core |
| Left Sidebar | Navigation (Chat, Memory), collapsible | P0 - Core |
| Right Sidebar | Activity stream showing tool calls/thinking | P1 - Important |
| Memory Graph View | Neural network visualization of memories | P2 - Future |
| Voice Mode | Animated blob "soul" with tool call orbits | P2 - Future |

---

## Architecture: Respecting the Constitution

Per `REFACTORING.md` Principle 2 (Headless Engine), we must:

1. **Keep the engine headless** - `src/engine/` stays UI-agnostic
2. **Create a new API entrypoint** - `src/api/web.py` as a thin layer
3. **Respect ownership** - This is Noel's sandbox (`src/api/`)

```
src/
├── api/
│   ├── terminal.py      # Existing CLI (untouched)
│   ├── web.py           # NEW: FastAPI server
│   └── static/          # NEW: Frontend assets
│       ├── index.html
│       ├── css/
│       │   └── styles.css
│       └── js/
│           ├── app.js           # Main app controller
│           ├── chat.js          # Chat module
│           ├── sidebar.js       # Sidebar module
│           ├── activity.js      # Activity stream module
│           └── websocket.js     # WebSocket client
```

---

## Phase 1: Backend Foundation (P0)

### 1.1 Create FastAPI Server (`src/api/web.py`)

**Purpose:** WebSocket-based server for real-time communication

```python
# Endpoints
POST   /api/chat              # Send message, get response
GET    /api/mcp/status        # Get MCP server status
POST   /api/mcp/reload        # Reload MCP config
GET    /api/memory/status     # Get session memory stats
POST   /api/memory/clear      # Clear memory
WS     /ws                    # Real-time updates (thinking, tool calls)
```

**Key Features:**
- WebSocket for streaming responses & activity updates
- Reuse existing `orchestrate()` from `src/engine/main_loop.py`
- Event emission during orchestration (router → planner → executor)

### 1.2 Modify Engine for Event Hooks

**File:** `src/engine/main_loop.py`

Add optional callback parameter for UI updates:

```python
async def orchestrate(
    request: str,
    mcp_manager: Optional[MCPManager] = None,
    session: Optional[SessionMemory] = None,
    on_event: Optional[Callable] = None,  # NEW: UI callback
) -> str:
    # Emit events during processing
    if on_event:
        await on_event({"type": "routing", "status": "started"})
```

Event types:
- `routing` - Router decision in progress
- `planning` - Planner generating subtasks
- `executing` - Executor running tool
- `tool_call` - Specific tool being called
- `synthesizing` - Combining results
- `complete` - Done

---

## Phase 2: Frontend Core (P0)

### 2.1 HTML Structure (`src/api/static/index.html`)

Modular HTML with clear component boundaries:

```html
<body>
  <!-- Left Sidebar Toggle -->
  <button class="toggle-btn" id="sidebarToggle">...</button>

  <!-- Right Sidebar Toggle -->
  <button class="toggle-btn" id="rightSidebarToggle">...</button>

  <!-- Left Navigation Sidebar -->
  <nav class="sidebar" id="sidebar">
    <div class="brand">JIT</div>
    <div class="nav-item active" data-view="chat">Chat</div>
    <div class="nav-item" data-view="memory">Memory</div>
  </nav>

  <!-- Right Activity Sidebar -->
  <aside class="right-sidebar" id="rightSidebar">
    <div class="activity-container" id="activityContainer"></div>
  </aside>

  <!-- Main Content -->
  <div class="main-content">
    <div class="app-container">
      <!-- Chat View -->
      <div class="chat-area" id="chatArea"></div>

      <!-- Memory View (hidden initially) -->
      <div class="graph-view view-hidden" id="graphArea"></div>

      <!-- Input Area -->
      <div class="input-area">
        <input type="text" placeholder="Type a message..." id="textInput">
        <button class="send-btn" id="sendBtn">→</button>
      </div>
    </div>
  </div>
</body>
```

### 2.2 CSS Architecture (`src/api/static/css/styles.css`)

Organized by component with CSS custom properties:

```css
/* === CORE VARIABLES === */
:root {
  --bg-base: #d64c4c;
  --bg-gradient: linear-gradient(135deg, #d64c4c 0%, #ef7b5d 60%, #ff9a9e 100%);
  --text-color: rgba(255, 255, 255, 0.95);
  --bubble-user: rgba(255, 255, 255, 0.15);
  --bubble-ai: rgba(255, 255, 255, 0.95);
  /* ... */
}

/* === LAYOUT === */
/* === SIDEBAR === */
/* === CHAT === */
/* === ACTIVITY STREAM === */
/* === INPUT AREA === */
/* === ANIMATIONS === */
/* === RESPONSIVE === */
```

### 2.3 JavaScript Modules (`src/api/static/js/`)

**Modular design** - each feature in its own file:

#### `websocket.js` - WebSocket Connection Manager
```javascript
export class WebSocketClient {
  constructor(url) { ... }
  connect() { ... }
  send(message) { ... }
  onMessage(callback) { ... }
  onActivity(callback) { ... }  // For activity stream
}
```

#### `chat.js` - Chat Interface Module
```javascript
export class ChatModule {
  constructor(containerEl, wsClient) { ... }
  addMessage(text, sender) { ... }
  showTypingIndicator() { ... }
  scrollToBottom() { ... }
}
```

#### `sidebar.js` - Sidebar Navigation Module
```javascript
export class SidebarModule {
  constructor(leftEl, rightEl) { ... }
  toggle(side) { ... }
  switchView(view) { ... }
}
```

#### `activity.js` - Activity Stream Module
```javascript
export class ActivityModule {
  constructor(containerEl) { ... }
  addCard(title, desc, icon, isProcessing) { ... }
  clearOld() { ... }
}
```

#### `app.js` - Main Application Controller
```javascript
import { WebSocketClient } from './websocket.js';
import { ChatModule } from './chat.js';
import { SidebarModule } from './sidebar.js';
import { ActivityModule } from './activity.js';

class App {
  constructor() {
    this.ws = new WebSocketClient('ws://localhost:8000/ws');
    this.chat = new ChatModule(...);
    this.sidebar = new SidebarModule(...);
    this.activity = new ActivityModule(...);
  }

  init() {
    this.ws.connect();
    this.bindEvents();
  }
}

new App().init();
```

---

## Phase 3: Real-Time Activity Stream (P1)

### 3.1 Backend Event Emission

Modify orchestration to emit events via WebSocket:

```python
# In web.py WebSocket handler
async def broadcast_activity(event_type: str, data: dict):
    await websocket.send_json({
        "type": "activity",
        "event": event_type,
        "data": data
    })

# Events emitted during orchestration:
# - {"type": "activity", "event": "thinking", "data": {"message": "Analyzing..."}}
# - {"type": "activity", "event": "tool_call", "data": {"tool": "brave_search", "status": "running"}}
# - {"type": "activity", "event": "tool_call", "data": {"tool": "brave_search", "status": "complete"}}
```

### 3.2 Frontend Activity Rendering

```javascript
// In activity.js
ws.onActivity((event) => {
  switch(event.event) {
    case 'thinking':
      this.addCard('Thinking', event.data.message, 'brain', true);
      break;
    case 'tool_call':
      const icon = event.data.status === 'running' ? 'spinner' : 'check';
      this.addCard(event.data.tool, event.data.status, icon, event.data.status === 'running');
      break;
  }
});
```

---

## Phase 4: Memory Graph View (P2 - Future)

### 4.1 Integration with Risang's Context System

When memory system is ready:

```python
# In web.py
@app.get("/api/memory/graph")
async def get_memory_graph():
    """Return memories as nodes for visualization."""
    # Future: Pull from Cognee/SessionMemory
    return {
        "center": {"id": "user", "label": "You"},
        "nodes": [
            {"id": 1, "memory": "...", "topics": [...], "updated": "..."},
            ...
        ]
    }
```

### 4.2 Frontend Graph Module (Future)

```javascript
// graph.js - Neural visualization
export class GraphModule {
  constructor(containerEl) { ... }
  initNodes(data) { ... }
  animate() { ... }  // Physics simulation
  showDetails(node) { ... }
}
```

---

## Phase 5: Voice Mode (P2 - Future)

Placeholder for voice integration:

```javascript
// voice.js
export class VoiceModule {
  constructor() { ... }
  enterVoiceMode() { ... }
  exitVoiceMode() { ... }
  animateSoul(intensity) { ... }
  showToolOrbit(active) { ... }
}
```

---

## Implementation Checklist

### Phase 1: Backend (P0)
- [ ] Create `src/api/web.py` with FastAPI + WebSocket
- [ ] Add event callback parameter to `orchestrate()`
- [ ] Implement `/api/chat` endpoint
- [ ] Implement `/api/mcp/status` endpoint
- [ ] Implement WebSocket `/ws` handler
- [ ] Add `uvicorn` to `requirements.txt`

### Phase 2: Frontend Core (P0)
- [ ] Create `src/api/static/` directory structure
- [ ] Implement `index.html` with semantic structure
- [ ] Implement `css/styles.css` with HER aesthetic
- [ ] Implement `js/websocket.js` module
- [ ] Implement `js/chat.js` module
- [ ] Implement `js/sidebar.js` module
- [ ] Implement `js/app.js` main controller
- [ ] Test chat flow end-to-end

### Phase 3: Activity Stream (P1)
- [ ] Add activity event emission to engine
- [ ] Implement `js/activity.js` module
- [ ] Wire up WebSocket activity events
- [ ] Test real-time tool call visualization

### Phase 4: Memory Graph (P2)
- [ ] Design memory API endpoint
- [ ] Implement `js/graph.js` module
- [ ] Add physics-based node animation
- [ ] Wire up with Risang's memory system

### Phase 5: Voice Mode (P2)
- [ ] Implement `js/voice.js` module
- [ ] Add blob animation CSS
- [ ] Integrate with speech API (future)

---

## Entry Point Update

Add web command to `src/main.py`:

```python
import sys

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "web":
        from src.api.web import run_web
        run_web()
    else:
        from src.api.terminal import run_terminal
        run_terminal()
```

**Usage:**
```bash
python -m src.main          # Terminal mode (default)
python -m src.main web      # Web mode
```

---

## Dependencies to Add

```txt
# requirements.txt additions
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6
websockets>=12.0
```

---

## File Summary

| File | Purpose | Lines (est.) |
|------|---------|--------------|
| `src/api/web.py` | FastAPI server + WebSocket | ~150 |
| `src/api/static/index.html` | Main HTML structure | ~80 |
| `src/api/static/css/styles.css` | All styling | ~400 |
| `src/api/static/js/app.js` | Main controller | ~50 |
| `src/api/static/js/websocket.js` | WS client | ~60 |
| `src/api/static/js/chat.js` | Chat module | ~80 |
| `src/api/static/js/sidebar.js` | Sidebar module | ~50 |
| `src/api/static/js/activity.js` | Activity stream | ~60 |

**Total estimated new code:** ~930 lines

---

## Notes

1. **No changes to core engine logic** - We only add an optional callback
2. **Terminal interface untouched** - Existing `terminal.py` works as-is
3. **Modular frontend** - Each JS module is independent and testable
4. **Progressive enhancement** - Start with chat, add features incrementally
5. **Memory/Voice are future** - Marked P2, implementation details TBD with team
