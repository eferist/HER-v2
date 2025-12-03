# Frontend Modular Refactor Plan

## Goal

Transform the current single-page frontend into a modular, page-based architecture supporting **CHAT**, **MEMORY**, and **TOOLS** pages while maintaining the HER-inspired aesthetic.

---

## Current State Analysis

### What We Have
```
frontend/
├── index.html           # Single HTML with all views
├── css/
│   └── styles.css       # Monolithic CSS (~576 lines)
└── js/
    ├── config.js        # API configuration ✓ (keep)
    ├── app.js           # Main controller (needs refactor)
    ├── websocket.js     # WebSocket client ✓ (keep)
    ├── chat.js          # Chat module ✓ (keep, enhance)
    ├── sidebar.js       # Sidebar module (needs refactor)
    └── activity.js      # Activity stream ✓ (keep)
```

### Problems
1. **Monolithic structure** - All views in single HTML
2. **Tight coupling** - App.js hardcoded to chat-only flow
3. **No routing** - View switching is DOM hide/show
4. **Mixed CSS** - No separation between shared and page-specific styles
5. **No page components** - Memory and Tools pages don't exist

---

## Proposed Structure

```
frontend/
├── index.html                    # Shell: navigation + page container
├── css/
│   ├── base/
│   │   ├── reset.css             # CSS reset
│   │   ├── variables.css         # CSS custom properties (colors, spacing)
│   │   └── typography.css        # Font styles
│   ├── components/
│   │   ├── sidebar.css           # Left navigation
│   │   ├── activity-panel.css    # Right activity stream
│   │   ├── buttons.css           # Button styles
│   │   ├── cards.css             # Card components
│   │   ├── inputs.css            # Input fields
│   │   └── status.css            # Status indicators
│   ├── pages/
│   │   ├── chat.css              # Chat page specific
│   │   ├── memory.css            # Memory page specific
│   │   └── tools.css             # Tools page specific
│   └── main.css                  # Imports all CSS (entry point)
│
└── js/
    ├── core/
    │   ├── config.js             # API configuration
    │   ├── websocket.js          # WebSocket client
    │   ├── router.js             # Client-side page routing (NEW)
    │   └── state.js              # Global state management (NEW)
    ├── components/
    │   ├── sidebar.js            # Navigation component
    │   ├── activity.js           # Activity stream component
    │   └── status-indicator.js   # Connection status (NEW)
    ├── pages/
    │   ├── BasePage.js           # Abstract base class (NEW)
    │   ├── ChatPage.js           # Chat page (from chat.js)
    │   ├── MemoryPage.js         # Memory page (NEW)
    │   └── ToolsPage.js          # Tools page (NEW)
    ├── services/
    │   └── api.js                # REST API calls (NEW)
    └── app.js                    # Main app entry (simplified)
```

---

## Architecture Decisions

### 1. Client-Side Routing
Simple hash-based routing without external dependencies:
```javascript
// URL patterns
#/chat    → ChatPage
#/memory  → MemoryPage
#/tools   → ToolsPage
```

### 2. Page Pattern
Each page is a self-contained module:
```javascript
// pages/BasePage.js
export class BasePage {
    constructor(container) { this.container = container; }
    mount() { /* render HTML */ }
    unmount() { /* cleanup */ }
    onMessage(msg) { /* handle websocket */ }
}
```

### 3. State Management
Minimal global state for cross-page data:
```javascript
// core/state.js
export const state = {
    connection: 'disconnected',
    currentPage: 'chat',
    memory: { items: [], searchQuery: '' },
    tools: { servers: [], selected: null }
};
```

### 4. Component Lifecycle
```
App.init()
    ↓
Router.navigate('#/chat')
    ↓
ChatPage.mount()
    ↓
[User navigates to #/memory]
    ↓
ChatPage.unmount() → MemoryPage.mount()
```

---

## Page Specifications

### CHAT Page (Existing, Enhanced)
- Chat message area with history
- Input field with send button
- Activity stream integration
- Typing indicators
- Message bubbles (user/AI)

### MEMORY Page (New)
Features:
- **Search bar** - Query long-term memory
- **Memory cards** - Display stored memories
- **Add memory** - Manual memory input
- **Memory timeline** - Chronological view
- **Tags/categories** - Organize memories

UI Sketch:
```
┌─────────────────────────────────────┐
│ [Search memories...]           [+]  │
├─────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ Memory  │ │ Memory  │ │ Memory  │ │
│ │ Card 1  │ │ Card 2  │ │ Card 3  │ │
│ │         │ │         │ │         │ │
│ │ 2 days  │ │ 1 week  │ │ 2 weeks │ │
│ └─────────┘ └─────────┘ └─────────┘ │
│                                     │
│ ┌─────────┐ ┌─────────┐             │
│ │ Memory  │ │ Memory  │             │
│ │ Card 4  │ │ Card 5  │             │
│ └─────────┘ └─────────┘             │
└─────────────────────────────────────┘
```

### TOOLS Page (New)
Features:
- **MCP server status** - Connected/disconnected indicators
- **Tool browser** - List available tools per server
- **Tool details** - Schema, description, parameters
- **Enable/disable** - Toggle MCP servers
- **Test tool** - Dry-run tool calls

UI Sketch:
```
┌─────────────────────────────────────┐
│ MCP Servers                         │
├─────────────────────────────────────┤
│ ┌─────────────────────────────────┐ │
│ │ 🟢 brave-search        [Toggle] │ │
│ │    └─ web_search                │ │
│ │    └─ local_search              │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🟢 filesystem          [Toggle] │ │
│ │    └─ read_file                 │ │
│ │    └─ write_file                │ │
│ │    └─ list_directory            │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🔴 telegram (disabled) [Toggle] │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: CSS Modularization
1. Split `styles.css` into base/, components/, pages/
2. Create `main.css` that imports all modules
3. Extract CSS variables into `variables.css`
4. Test that existing UI still works

### Phase 2: Core Infrastructure
1. Create `router.js` with hash-based routing
2. Create `state.js` for global state
3. Create `api.js` for REST endpoints
4. Create `BasePage.js` abstract class

### Phase 3: Refactor Existing Code
1. Move `chat.js` → `pages/ChatPage.js` (extend BasePage)
2. Refactor `sidebar.js` → `components/sidebar.js` (routing-aware)
3. Refactor `app.js` to use router and page mounting
4. Update `index.html` to page container pattern

### Phase 4: Build New Pages
1. Create `pages/MemoryPage.js` with memory features
2. Create `pages/ToolsPage.js` with MCP management
3. Add corresponding CSS in `pages/memory.css` and `pages/tools.css`

### Phase 5: Integration & Polish
1. Connect pages to WebSocket events appropriately
2. Add page transitions/animations
3. Test navigation between all pages
4. Ensure activity panel works across pages

---

## Backend API Requirements

New endpoints needed (for Memory and Tools pages):

```
# Memory endpoints
GET  /api/memory              # List memories
POST /api/memory              # Add memory
GET  /api/memory/search?q=    # Search memories
DELETE /api/memory/:id        # Delete memory

# Tools endpoints
GET  /api/mcp/servers         # List all MCP servers with status
POST /api/mcp/servers/:name/toggle  # Enable/disable server
GET  /api/mcp/servers/:name/tools   # Get tools for a server
POST /api/mcp/test            # Test a tool call (dry run)
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `css/base/reset.css` | CSS reset |
| `css/base/variables.css` | Design tokens |
| `css/base/typography.css` | Font styles |
| `css/components/*.css` | Shared component styles |
| `css/pages/*.css` | Page-specific styles |
| `css/main.css` | CSS entry point |
| `js/core/router.js` | Client-side routing |
| `js/core/state.js` | Global state |
| `js/services/api.js` | REST API service |
| `js/pages/BasePage.js` | Page base class |
| `js/pages/ChatPage.js` | Chat page |
| `js/pages/MemoryPage.js` | Memory page |
| `js/pages/ToolsPage.js` | Tools page |

## Files to Modify

| File | Changes |
|------|---------|
| `index.html` | Shell structure, page container |
| `js/app.js` | Router integration, page lifecycle |
| `js/components/sidebar.js` | Navigation links with routing |
| `js/components/activity.js` | Minor: ensure page-agnostic |

## Files to Delete

| File | Reason |
|------|--------|
| `css/styles.css` | Replaced by modular CSS |
| `js/chat.js` | Moved to pages/ChatPage.js |

---

## Alignment with Refactoring Principles

### Principle 1: Sandbox - Organize by Owner
✅ Frontend remains in Noel's sandbox (`frontend/`)
✅ No changes to backend structure

### Principle 2: Headless Engine - Separate Logic from UI
✅ Pages are pure UI components
✅ State management separate from rendering
✅ WebSocket/API services are reusable

### Principle 3: Utilitarian Mandate - Refactor with Purpose
✅ **Enables:** Three distinct pages (CHAT, MEMORY, TOOLS)
✅ **Enables:** Future page additions without touching existing pages
✅ **Enables:** Independent CSS customization per page
✅ **Enables:** Clear code organization for team collaboration

---

## Success Criteria

- [ ] Navigation between CHAT, MEMORY, TOOLS works
- [ ] Chat functionality preserved
- [ ] Memory page shows/searches memories
- [ ] Tools page shows MCP server status
- [ ] Activity panel works across all pages
- [ ] HER aesthetic maintained
- [ ] No regression in existing features
