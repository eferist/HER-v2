# Refinement Proposal: Activity Feed UX Improvements

## The Problem

Current behavior is janky:
1. Activity items stack vertically (gets long)
2. Sudden collapse when done
3. Abrupt appearance of final response
4. No visual continuity

---

## Refinement Options

### Option A: "Single Line Status" (Simplest)

**What it looks like:**
Instead of stacking items, show only ONE line that updates in place:

```
┌─────────────────────────────────────┐
│ ● Analyzing request...              │  ← updates in place
│ ● Route: using tools                │  ← replaces previous
│ ● Planning: 2 subtasks              │  ← replaces previous
│ ● Running: search_web...            │  ← replaces previous
└─────────────────────────────────────┘
```

Then smoothly fades out before response appears.

**Pros:** Compact, no vertical growth, clean
**Cons:** Can't see history of what happened

---

### Option B: "Compact Horizontal Pills" (Balanced)

**What it looks like:**
Small pills/badges that appear horizontally, wrapping if needed:

```
┌──────────────────────────────────────────────────────┐
│ [✓ Route] [✓ Plan] [● Executing: search_web]         │
└──────────────────────────────────────────────────────┘
```

Each stage becomes a small pill. Current stage pulses/glows. Completed stages get checkmark.

**Pros:** Shows progress history, stays compact, looks modern
**Cons:** Slightly more complex

---

### Option C: "Progress Steps Bar" (Most Polished)

**What it looks like:**
A horizontal progress indicator with labeled steps:

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│    Route ──── Plan ──── Execute ──── Done            │
│      ✓         ✓          ●                          │
│                      search_web                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Steps connected by lines
- Current step highlighted with accent color
- Sub-info shown below (like which tool is running)
- Smooth transitions between steps

**Pros:** Very clear, professional look, shows overall progress
**Cons:** Takes more vertical space, more CSS work

---

### Option D: "Inline Typing Status" (Minimalist)

**What it looks like:**
Just enhance the existing typing indicator with a label:

```
┌─────────────────────────────────────┐
│                                     │
│    ● ● ●  Executing search_web...   │
│                                     │
└─────────────────────────────────────┘
```

The three dots stay, but we add text next to them showing current stage.

**Pros:** Minimal change, familiar UX, very compact
**Cons:** Less informative, no progress history

---

## My Recommendation: Option B (Compact Horizontal Pills)

Best balance of:
- Stays compact (no vertical explosion)
- Shows progress history (see what stages completed)
- Modern look (pill/badge style)
- Smooth transitions possible

**Visual mockup:**
```
Before response:
┌──────────────────────────────────────────────────────┐
│  [✓ Analyzing] [✓ Planning] [● search_web]           │
│                                                      │
│  ● ● ●                                               │
└──────────────────────────────────────────────────────┘

After response arrives:
┌──────────────────────────────────────────────────────┐
│  The weather in Tokyo is currently 18°C with...      │
└──────────────────────────────────────────────────────┘
```

Pills fade out smoothly, then response fades in.

---

## Summary

| Option | Compactness | Info Shown | Polish Level | Effort |
|--------|-------------|------------|--------------|--------|
| A: Single Line | Best | Low | Medium | Low |
| B: Horizontal Pills | Good | Medium | High | Medium |
| C: Progress Bar | Medium | High | Very High | High |
| D: Inline Typing | Best | Low | Low | Very Low |

---

## Which one do you want?

1. **"Keep it simple"** → Option A or D
2. **"Balance of form and function"** → Option B (recommended)
3. **"Make it fancy"** → Option C
