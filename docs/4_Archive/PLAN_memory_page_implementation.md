# Memory Page Implementation Plan

## Goal

Integrate the canvas-based memory graph from UI_REFERENCE.md into the existing MemoryPage.js

---

## Files to Modify

| File | Action |
|------|--------|
| `frontend/js/pages/MemoryPage.js` | Rewrite with canvas graph |
| `frontend/css/pages/memory.css` | Update styles from reference |

---

## Implementation Steps

### 1. Update memory.css

Extract these styles from reference:
- `.memory-canvas-container` - transparent, full height
- `#memoryCanvas` - cursor grab/grabbing
- `.memory-detail-overlay` - bottom overlay card (active state)
- `.memory-meta`, `.memory-text`, `.memory-tags`, `.tag` - detail card elements

### 2. Update MemoryPage.js

#### HTML Structure
```html
<div class="memory-page">
  <div class="memory-search-container">
    <div class="input-area">
      <input type="text" placeholder="Search memories..." id="memorySearch">
    </div>
  </div>
  <div class="memory-canvas-container">
    <canvas id="memoryCanvas"></canvas>
    <div class="memory-detail-overlay" id="memoryOverlay">
      <div class="memory-meta" id="memMeta"></div>
      <div class="memory-text" id="memText"></div>
      <div class="memory-tags" id="memTags"></div>
    </div>
  </div>
</div>
```

#### Core Components to Port

1. **Particle Class**
   - Properties: memory, x, y, vx, vy, neighbors, radius
   - Methods: update(), draw()

2. **Physics Constants**
   ```js
   REPULSION_RADIUS = 200
   SPRING_LENGTH = 120
   SPRING_STRENGTH = 0.005
   DAMPING = 0.85
   CENTERING_FORCE = 0.001
   ```

3. **Graph Functions**
   - `initMemoryGraph()` - setup canvas, spawn particles
   - `resizeCanvas()` - responsive sizing
   - `filterAndSpawnParticles(query)` - create nodes from API data
   - `applyForces()` - repulsion + spring physics
   - `animateGraph()` - main render loop
   - `drawTooltip(particle)` - hover tooltip

4. **Interaction Handlers**
   - Mouse hover → highlight node + show detail
   - Mouse drag → move node
   - Search input → filter and respawn

5. **API Integration**
   - Replace `MOCK_MEMORIES` with `api.searchMemories(query)`
   - Call on mount and on search input

---

## Key Differences from Reference

| Reference | Our Implementation |
|-----------|-------------------|
| Inline script | ES6 module class |
| MOCK_MEMORIES array | api.searchMemories() |
| Global variables | Class properties |
| Direct DOM queries | Mount/unmount lifecycle |

---

## Implementation Order

1. Copy CSS styles to memory.css
2. Update MemoryPage render() with new HTML
3. Add Particle class
4. Add physics constants + functions
5. Add mouse event handlers
6. Connect to API (replace mock data)
7. Test resize + cleanup on unmount
