# MCP Call Flow - Vibe Coder Edition

## What Actually Happens When You Ask "What's the weather in Tokyo?"

```
YOU: "What's the weather in Tokyo?"
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. ROUTER                                                       │
│     "Is this a simple question or do I need tools?"              │
│     Answer: "Need tools" → goes to PLANNER                       │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. PLANNER                                                      │
│     "What tools do I need?"                                      │
│     Looks at available tools: [get_current_weather, ...]         │
│     Answer: "Use get_current_weather tool"                       │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. EXECUTOR                                                     │
│     Creates an Agent with the selected MCP tools                 │
│     Sends request to LLM (Gemini) with tool definitions          │
│                                                                  │
│     ⚠️  THIS IS WHERE THE PROBLEM HAPPENS ⚠️                     │
│     The tool schema sent to Gemini might be invalid!             │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. LLM (Gemini)                                                 │
│     Receives: "User wants weather" + tool definitions            │
│     Decides: "I'll call get_current_weather(city='Tokyo')"       │
│                                                                  │
│     IF schema is invalid → LLM gets confused/rejects             │
│     IF schema is valid → LLM makes correct tool call             │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. MCP TOOL EXECUTION                                           │
│     Agent calls the actual MCP server (openweather)              │
│     MCP server calls OpenWeather API                             │
│     Returns: {"temp": 15, "condition": "cloudy", ...}            │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. LLM RESPONSE                                                 │
│     Gemini receives the weather data                             │
│     Formats a nice response for you                              │
│                                                                  │
│     IF earlier schema was bad → "Sorry, couldn't get weather"    │
│     IF schema was good → "It's 15°C and cloudy in Tokyo!"        │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. SYNTHESIZER                                                  │
│     Final polish on the response                                 │
│     Returns to you                                               │
└─────────────────────────────────────────────────────────────────┘
      │
      ▼
YOU SEE: "It's 15°C and cloudy in Tokyo!" (or error message)
```

## The Schema Problem Explained Simply

### What's a "Schema"?

A schema is like a **form template** that tells the LLM:
- What parameters a tool accepts
- What type each parameter should be (string, number, etc.)

### Example: Good Schema vs Bad Schema

**Good Schema** (Brave Search) ✅
```json
{
  "query": {
    "type": "string",
    "description": "What to search for"
  }
}
```
LLM thinks: "OK, I just need to pass a text string. Easy!"

**Bad Schema** (OpenWeather) ❌
```json
{
  "city": {
    "anyOf": [
      {"type": "string"},
      {"type": "null"}
    ],
    "default": null
  }
}
```
LLM thinks: "WTF is anyOf? Is it a string? Is it null? I'm confused..."

### Why Does This Happen?

```
OpenWeather MCP Server (Python/Pydantic)
         │
         │  Pydantic auto-generates fancy JSON Schema
         │  with "anyOf", "oneOf", "$ref", etc.
         ▼
┌─────────────────────┐
│  Complex Schema     │  ← This is valid JSON Schema
│  (anyOf, $ref, etc) │    but LLMs don't understand it well
└─────────────────────┘
         │
         │  We try to fix it with fix_tool_schema()
         │  but it doesn't catch everything
         ▼
┌─────────────────────┐
│  Still Complex      │  ← anyOf with null still there!
│  Schema             │
└─────────────────────┘
         │
         │  Sent to Gemini
         ▼
┌─────────────────────┐
│  Gemini             │  → Gets confused
│  "I don't get it"   │  → Makes wrong decisions
└─────────────────────┘
```

## Where to Look When Debugging

### File Locations

| What | File | Line |
|------|------|------|
| Schema fixer (current) | `src/orchestrator/mcp.py` | 14-81 |
| MCP connection | `src/orchestrator/mcp.py` | 226-263 |
| Tool execution | `src/orchestrator/executor/single.py` | 13-44 |
| Gemini schema conversion | `agno/libs/agno/agno/utils/gemini.py` | 404-426 |

### Quick Debug Commands

**See what schemas your MCP tools have:**
```bash
source venv/bin/activate
python -c "
import asyncio
import json
from src.orchestrator.mcp import load_mcp_config, connect_all_servers

async def main():
    configs, _ = load_mcp_config()
    manager = await connect_all_servers(configs)
    for name, mcp in manager.servers.items():
        print(f'=== {name} ===')
        for tool_name, func in mcp.functions.items():
            print(f'{tool_name}: {json.dumps(func.parameters, indent=2)}')

asyncio.run(main())
"
```

**Check for problematic patterns:**
```bash
# Look for "anyOf" in schemas
python -c "..." | grep -i "anyof"

# Look for "null" types
python -c "..." | grep -i '"null"'
```

## Current Status of MCP Servers

| Server | Schema Status | Works? |
|--------|---------------|--------|
| brave-search | Clean ✅ | Yes |
| filesystem | Clean ✅ | Yes |
| spotify | Clean ✅ | Yes |
| openweather | Has `anyOf` ❌ | Broken |

## The Fix Options (Simple Version)

### Option A: Fix the Schema Before Sending
```
MCP Tool → [Fix Schema] → LLM Provider
              ↑
        Make "anyOf" into simple "type"
```

### Option B: Use LLM to Fix Schema (Your Idea)
```
MCP Tool → [LLM Sanitizer] → LLM Provider
                ↑
        "Hey LLM, clean this up for me"
```

### Option C: Fix at Startup (Hybrid)
```
Startup:  MCP Tool → [LLM Sanitizer] → Cache Fixed Schema

Runtime:  Use Cached Schema → LLM Provider
```

## TL;DR

1. **Problem**: Some MCP tools (like OpenWeather) return complex JSON Schemas
2. **Why**: They use Pydantic which generates fancy schemas
3. **Effect**: Gemini gets confused, says "sorry can't help"
4. **Solution**: Clean up the schema before sending to Gemini
5. **Your idea**: Use another LLM to clean it up (smart but adds latency)

---

*This doc is for understanding the flow. See `MCP_SCHEMA_ISSUE_REPORT.md` for the full technical analysis.*
