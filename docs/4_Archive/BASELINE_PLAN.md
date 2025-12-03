# Baseline Plan - Strip Back to MVP

## The Problem

We added schema "fixes" that were supposed to help, but they might be causing issues (like Spotify breaking). Let's go back to basics and let the program run as-is, without our interventions.

## What Was Added (The "Fixes")

### 1. `fix_tool_schema()` function
**Location**: `src/orchestrator/mcp.py` lines 14-81

This function tries to "fix" schemas by:
- Inlining `$ref` references
- Converting `prefixItems` to `items`
- Adding `items` to arrays that don't have it
- Recursively processing `anyOf/oneOf/allOf`

### 2. `sanitize_mcp_tools()` function
**Location**: `src/orchestrator/mcp.py` lines 84-102

Wrapper that applies `fix_tool_schema()` to all tools.

### 3. Schema fixing at connection time
**Location**: `src/orchestrator/mcp.py` lines 257-261

```python
# Fix malformed schemas in registered functions
if hasattr(mcp, 'functions'):
    for func in mcp.functions.values():
        if hasattr(func, 'parameters') and func.parameters:
            func.parameters = fix_tool_schema(func.parameters)
```

### 4. Sanitize calls in executors
**Locations**:
- `src/orchestrator/executor/single.py` line 24
- `src/orchestrator/executor/parallel.py` line 26
- `src/orchestrator/executor/sequential.py` line 63

```python
sanitize_mcp_tools(mcp_tools)  # or filtered_tools
```

## What to Remove for Baseline

```
┌─────────────────────────────────────────────────────────────┐
│  FILES TO MODIFY                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  src/orchestrator/mcp.py                                     │
│  ├── DELETE: fix_tool_schema() function (lines 14-81)        │
│  ├── DELETE: sanitize_mcp_tools() function (lines 84-102)    │
│  └── DELETE: Schema fixing in connect_mcp_server()           │
│              (lines 257-261)                                 │
│                                                              │
│  src/orchestrator/executor/single.py                         │
│  ├── DELETE: import sanitize_mcp_tools (line 10)             │
│  └── DELETE: sanitize_mcp_tools(mcp_tools) call (line 24)    │
│                                                              │
│  src/orchestrator/executor/parallel.py                       │
│  ├── DELETE: sanitize_mcp_tools from import (line 11)        │
│  └── DELETE: sanitize_mcp_tools(filtered_tools) (line 26)    │
│                                                              │
│  src/orchestrator/executor/sequential.py                     │
│  ├── DELETE: sanitize_mcp_tools from import (line 9)         │
│  └── DELETE: sanitize_mcp_tools(filtered_tools) (line 63)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Before vs After

### BEFORE (Current - With Fixes)
```
MCP Server → [fix_tool_schema] → [sanitize_mcp_tools] → LLM
                   ↑                      ↑
            At connection          At execution
            (might break things)   (double processing!)
```

### AFTER (Baseline - No Intervention)
```
MCP Server → LLM
     ↑
  Raw schema passed through
  Let AGNO framework handle it
```

## Why This Makes Sense

1. **AGNO already has schema handling** in `agno/libs/agno/agno/utils/gemini.py`
2. **Double processing might corrupt** - we fix, then AGNO tries to fix again
3. **Spotify was working before** - our "fixes" might have broken it
4. **Simpler is better** - less code = fewer bugs

## The Approach

### Step 1: Create backup branch
```bash
git checkout -b backup-with-fixes
git add -A
git commit -m "Backup before stripping schema fixes"
git checkout master
```

### Step 2: Remove the fixes
Apply the deletions listed above.

### Step 3: Test each MCP server
```bash
# Test brave-search
> Search for weather in Tokyo

# Test filesystem
> List files in current directory

# Test spotify
> Search for songs by Taylor Swift

# Test openweather
> What's the weather in Tokyo?
```

### Step 4: Document what works and what doesn't
Create a simple test results table.

## Expected Outcomes

| Server | Expected Result |
|--------|-----------------|
| brave-search | Should work (clean schema) |
| filesystem | Should work (clean schema) |
| spotify | Should work (was working before) |
| openweather | Might fail (anyOf schema) |

## If OpenWeather Fails

That's OK! At least we know:
1. The **baseline** is working for other servers
2. OpenWeather has a **specific issue** with its schema
3. We can create a **targeted fix** just for that pattern

## Commands to Execute

```bash
# 1. Backup current state
git stash  # or commit

# 2. Apply baseline changes (Claude will do this)

# 3. Test the program
source venv/bin/activate
python -m src.orchestrator.main

# 4. Try different queries and note results
```

## Summary

**Goal**: Get back to a clean baseline where:
- Code is simple
- No schema manipulation
- We can see what actually works vs what doesn't
- Spotify works again (hopefully!)

Then we can add targeted fixes ONLY where needed.

---

**Ready to proceed?** Say "yes" and I'll strip the code back to baseline.
