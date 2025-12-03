# MCP Schema Issue Analysis Report

## Executive Summary

The JIT Orchestrator experiences issues when sending MCP tool schemas to LLM providers (primarily Gemini). The core problem is that **certain MCP servers return tool schemas with JSON Schema constructs that are not fully supported by LLM function-calling APIs**, causing validation failures or unexpected behavior.

## Problem Description

When an MCP tool call is attempted, the LLM provider rejects the request or produces incorrect responses due to invalid/unsupported schema patterns in the tool definitions.

### Observed Behavior

1. **OpenWeather MCP server tools fail silently** - The LLM receives the weather data but responds with "I'm sorry, I wasn't able to retrieve the weather" despite the tool call succeeding
2. **Some tool schemas pass through without issues** (e.g., Brave Search, Filesystem, Spotify)
3. **The current `fix_tool_schema()` function is incomplete** - It handles some cases but misses critical schema patterns

## Root Cause Analysis

### Schema Flow

```
MCP Server → (inputSchema) → MCPTools.build_tools() → Function.parameters → Agent → Gemini.get_request_params() → format_function_definitions() → API Call
```

### Problematic Schema Patterns Found

#### 1. `anyOf` with `null` Type (OpenWeather)

The OpenWeather MCP server returns schemas with optional/nullable fields using `anyOf`:

```json
{
  "properties": {
    "city": {
      "anyOf": [
        {"type": "string"},
        {"type": "null"}
      ],
      "default": null,
      "title": "City"
    },
    "coordinate": {
      "anyOf": [
        {"type": "array", "items": {"type": "number"}},
        {"type": "null"}
      ],
      "default": null
    }
  }
}
```

**Issue**: Gemini's API converts this through `convert_schema()` in `agno/libs/agno/agno/utils/gemini.py`, but the handling of `anyOf` with null types is incomplete, leading to improper schema conversion.

#### 2. Current Fix Function Coverage

The existing `fix_tool_schema()` in `src/orchestrator/mcp.py` handles:
- Missing `items` in array types
- `prefixItems` (tuple) conversion to `items` (array)
- `$ref` reference inlining
- Recursive `anyOf/oneOf/allOf` fixing

**What's Missing**:
- Proper handling of `anyOf` with null type (nullable field pattern)
- The `title` field in parameter schemas (causes issues with some providers)
- Default values in nullable fields
- Conversion of nullable patterns to provider-specific formats

### Current Implementation Analysis

#### Location: `src/orchestrator/mcp.py` (lines 14-81)

```python
def fix_tool_schema(schema: dict, defs: dict = None) -> dict:
    """
    Fix malformed tool schemas from MCP servers.
    """
    # ... handles some cases but NOT anyOf with null
```

#### Location: `agno/libs/agno/agno/utils/gemini.py` (lines 360-401)

The `convert_schema()` function does attempt to handle `anyOf`:

```python
elif schema_type == "" and "anyOf" in schema_dict:
    any_of = []
    for sub_schema in schema_dict["anyOf"]:
        sub_schema_converted = convert_schema(sub_schema, root_schema, visited_refs)
        any_of.append(sub_schema_converted)

    is_nullable = False
    filtered_any_of = []

    for schema in any_of:
        if schema is None:
            is_nullable = True
        else:
            filtered_any_of.append(schema)

    # ...
```

**BUT**: This only works when `anyOf` is at the root level with `type == ""`. The OpenWeather schema has `anyOf` inside properties, which is not handled.

## Affected MCP Servers

| Server | Status | Issue |
|--------|--------|-------|
| openweather | **AFFECTED** | `anyOf` with `null` type in city/coordinate fields |
| brave-search | OK | No schema issues |
| filesystem | OK | No schema issues |
| spotify | OK | No schema issues |
| geoapify | Disabled | Likely has issues (stdout logging bug noted) |
| telegram | Disabled | Unknown |
| notion | Disabled | Unknown |
| github | Disabled | Unknown |
| google-workspace | Disabled | Unknown |

## Technical Deep Dive

### Schema Transformation Pipeline

1. **MCP Server** sends `inputSchema` (JSON Schema)
2. **MCPTools.build_tools()** creates `Function` objects with `parameters=tool.inputSchema`
3. **connect_mcp_server()** calls `fix_tool_schema()` - **PARTIAL FIX**
4. **Agent.aget_tools()** prepares tools for model
5. **Gemini.get_request_params()** calls `format_function_definitions(tools)`
6. **format_function_definitions()** calls `convert_schema()` for each tool
7. **convert_schema()** handles some patterns but misses property-level `anyOf`

### Why the Weather Tool "Succeeds" But Reports Failure

1. The schema with `anyOf` is passed through
2. Gemini's `convert_schema()` partially handles it but produces incorrect output
3. The LLM makes the tool call successfully (we see the HTTP requests to OpenWeather)
4. The LLM receives the weather data
5. **BUT** the response parsing or the model's understanding of the schema is corrupted
6. The model doesn't properly interpret the result and says "unable to retrieve"

This is a **silent failure** - the tool call succeeds but the model behavior is incorrect.

## Recommended Solutions

### Option 1: Enhance `fix_tool_schema()` in `src/orchestrator/mcp.py`

**Pros**: Local fix, doesn't modify AGNO framework
**Cons**: May miss edge cases, needs maintenance

```python
def fix_tool_schema(schema: dict, defs: dict = None) -> dict:
    # ... existing code ...

    # NEW: Handle anyOf with null type (nullable pattern)
    if "anyOf" in schema:
        any_of = schema["anyOf"]
        non_null_types = [s for s in any_of if s.get("type") != "null"]
        has_null = any(s.get("type") == "null" for s in any_of)

        if len(non_null_types) == 1:
            # Simple nullable: use the non-null type
            result = fix_tool_schema(non_null_types[0].copy(), defs)
            if has_null:
                result["nullable"] = True
            # Preserve default value
            if "default" in schema:
                result["default"] = schema["default"]
            return result
        elif len(non_null_types) > 1:
            # Union type - keep as anyOf but remove null
            schema = schema.copy()
            schema["anyOf"] = [fix_tool_schema(s, defs) for s in non_null_types]
            if has_null:
                schema["nullable"] = True

    # ... rest of existing code ...
```

### Option 2: Pre-process Schemas at MCP Connection Time

Add a more comprehensive schema normalization step in `connect_mcp_server()` that converts all complex JSON Schema patterns to simpler forms that all LLM providers support.

### Option 3: Fix in AGNO Framework

Modify `convert_schema()` in `agno/libs/agno/agno/utils/gemini.py` to handle property-level `anyOf` patterns.

**Pros**: Fixes at the source, benefits all users
**Cons**: Requires framework modification

### Option 4: Use OpenRouter as Fallback

OpenRouter's API may have better schema handling. Configure the agent to use OpenRouter for tools with complex schemas.

## Recommended Implementation Priority

1. **Immediate (Option 1)**: Enhance `fix_tool_schema()` to handle `anyOf` with null type
2. **Short-term**: Add comprehensive schema validation/warning logging
3. **Medium-term**: Submit PR to AGNO framework with proper fix
4. **Long-term**: Consider schema versioning/compatibility layers

## Test Cases to Add

```python
# Test Case 1: anyOf with null type
schema_anyof_null = {
    "properties": {
        "city": {
            "anyOf": [{"type": "string"}, {"type": "null"}],
            "default": None
        }
    },
    "type": "object"
}
# Expected: {"properties": {"city": {"type": "string", "nullable": true}}, "type": "object"}

# Test Case 2: Nested anyOf
schema_nested = {
    "properties": {
        "items": {
            "type": "array",
            "items": {
                "anyOf": [{"type": "string"}, {"type": "integer"}]
            }
        }
    }
}

# Test Case 3: Complex union types
# ... more test cases
```

## Additional Findings

### MCP Connection Cleanup Issue

During investigation, a separate issue was found: MCP connections throw errors during cleanup:

```
RuntimeError: Attempted to exit cancel scope in a different task than it was entered in
```

This is related to `anyio` task management but doesn't affect functionality - it's a cleanup/shutdown issue that should also be addressed.

## Conclusion

The MCP schema issue is caused by incomplete handling of JSON Schema `anyOf` patterns with null types. The fix requires enhancing the `fix_tool_schema()` function to properly convert nullable field patterns to simpler schemas that LLM providers can handle.

The OpenWeather MCP server is the primary affected server in the current configuration, but this pattern is common in Pydantic-generated schemas and will likely affect other MCP servers (especially Python-based ones using Pydantic).

---

**Report Generated**: 2025-12-02
**Analyzed By**: Claude Code Analysis
**Codebase Version**: Current master
