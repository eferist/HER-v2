# Plan: Tools Page - MCP Server Grid

## Overview

Redesign the Tools page to display available MCP servers in a visually appealing 3-column grid layout. Each server is represented as a card showing its status, name, description, and tool count.

## Current State

- Tools page exists but uses a vertical list layout
- Frontend expects `/api/mcp/servers` endpoint (not implemented in backend)
- MCP config includes: name, enabled status, description per server
- Each server has multiple tools available

## Visual Design

### Layout
- **Grid**: 3 columns on desktop, 2 on tablet, 1 on mobile
- **Cards**: Glassmorphism style consistent with existing UI
- **Spacing**: 16px gap between cards

### Card Design
```
┌─────────────────────────────┐
│  [Icon]     ● Connected     │  <- Status indicator (top-right)
│                             │
│  brave-search               │  <- Server name (bold)
│  Web search, news, places   │  <- Description (muted)
│                             │
│  ┌─────┐                    │
│  │  3  │ tools available    │  <- Tool count badge
│  └─────┘                    │
└─────────────────────────────┘
```

### Visual Elements
- **Status dot**: Green (connected), Red (disconnected), Gray (disabled)
- **Icon**: Unique icon per server type (search, file, weather, message)
- **Card hover**: Subtle lift effect + border glow
- **Tool count**: Pill/badge style

### Color Palette (existing variables)
- Card background: `var(--card-bg)`
- Border: `rgba(255, 255, 255, 0.15)`
- Status connected: `var(--status-connected)`
- Status error: `var(--status-error)`
- Text muted: `var(--text-muted)`

## Implementation Tasks

### 1. Backend: Add `/api/mcp/servers` Endpoint
**File**: `backend/src/api/web.py`

Add new endpoint that returns:
```json
{
  "servers": [
    {
      "name": "brave-search",
      "enabled": true,
      "connected": true,
      "description": "Web search, news, local places",
      "tools": ["brave_web_search", "brave_local_search"],
      "tool_count": 2
    }
  ]
}
```

### 2. Frontend: Update ToolsPage.js
**File**: `frontend/js/pages/ToolsPage.js`

- Replace list render with grid render
- Add icon mapping for server types
- Update card template for new design
- Remove expand/collapse logic (not needed for grid)

### 3. Frontend: Update tools.css
**File**: `frontend/css/pages/tools.css`

- Add `.tools-grid` with CSS Grid (3 columns)
- Style `.tool-card` with glassmorphism
- Add hover effects
- Add responsive breakpoints
- Style status indicators and tool count badge

## File Changes Summary

| File | Action |
|------|--------|
| `backend/src/api/web.py` | Add `/api/mcp/servers` endpoint |
| `frontend/js/pages/ToolsPage.js` | Rewrite to grid layout |
| `frontend/css/pages/tools.css` | Rewrite styles for grid + cards |

## Acceptance Criteria

- [ ] Grid displays 3 columns on desktop (>1024px)
- [ ] Grid displays 2 columns on tablet (768-1024px)
- [ ] Grid displays 1 column on mobile (<768px)
- [ ] Each card shows: icon, status, name, description, tool count
- [ ] Status indicator reflects actual connection state
- [ ] Cards have hover animation
- [ ] Loading state shows skeleton/spinner
- [ ] Empty state shows message when no servers
