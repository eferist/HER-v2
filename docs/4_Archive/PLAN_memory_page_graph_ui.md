# Plan: Memory Page Graph UI Implementation

## Goal

Replace the current card-grid Memory page with an interactive force-directed graph visualization inspired by the HER movie aesthetic.

---

## Implementation Steps

### Step 1: Update `memory.css`

Replace grid styles with canvas container styles:

- Remove `.memory-grid` and `.memory-card` styles
- Add `.memory-canvas-container` for the canvas wrapper
- Add `.memory-detail-overlay` for the hover/click detail panel
- Add `.tag` styles for entity tags

### Step 2: Update `MemoryPage.js`

Complete rewrite to include:

1. **Canvas Setup** - Initialize canvas, context, resize handling
2. **Particle Class** - Node representation with position, velocity, radius
3. **Physics Engine** - Repulsion, spring forces, damping, centering
4. **Animation Loop** - requestAnimationFrame for smooth rendering
5. **Interaction Handlers** - Mouse hover, drag, search input
6. **Detail Overlay** - Show memory details on hover/drag
7. **API Integration** - Fetch from `/api/memory/search`

### Step 3: Update `api.js`

Add `saveMemory()` method for the save endpoint (optional for this phase).

### Step 4: Update `config.js`

Add `MEMORY_SAVE` endpoint constant.

---

## File Changes

| File | Action |
|------|--------|
| `frontend/css/pages/memory.css` | Rewrite |
| `frontend/js/pages/MemoryPage.js` | Rewrite |
| `frontend/js/services/api.js` | Add saveMemory() |
| `frontend/js/core/config.js` | Add MEMORY_SAVE endpoint |

---

## Physics Constants

```javascript
const REPULSION_RADIUS = 200;
const SPRING_LENGTH = 120;
const SPRING_STRENGTH = 0.005;
const DAMPING = 0.85;
const CENTERING_FORCE = 0.001;
```

---

## Data Flow

```
User opens Memory page
        │
        ▼
MemoryPage.mount()
        │
        ▼
Fetch memories from API ──► /api/memory/search?q=
        │
        ▼
Create Particle for each memory
        │
        ▼
Build connections (shared entities)
        │
        ▼
Start animation loop
        │
        ├──► Apply forces (repulsion, springs, damping)
        ├──► Update positions
        ├──► Draw connections + particles
        └──► Check hover/drag interactions
```

---

## Testing

1. Open Memory page in browser
2. Verify particles appear and animate
3. Test hover - should show tooltip + highlight connections
4. Test drag - should freeze particle, show detail overlay
5. Test search - should filter and respawn particles
6. Verify resize handling works
