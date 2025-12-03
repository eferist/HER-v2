# LLM Stack Documentation

This document provides a comprehensive overview of all Large Language Models (LLMs) used in the spawnTrial orchestration system.

---

## Overview

The system uses a **multi-provider, multi-model architecture** with automatic fallback support. This ensures reliability and flexibility across different AI capabilities.

### Providers Used

| Provider | Access Method | Primary Use |
|----------|---------------|-------------|
| **Google (Gemini)** | Direct API | Primary model for all components |
| **OpenAI (GPT-4o)** | Via OpenRouter | Fallback for complex reasoning tasks |
| **Moonshotai (Kimi K2)** | Via OpenRouter | Fast fallback for routing & synthesis |

---

## Model Configuration

### Primary Model
```
google:gemini-2.5-flash
```
- **Provider**: Google
- **Purpose**: Default model for all components
- **Characteristics**: Fast, cost-effective, good general performance

### Fallback Models
```
openrouter:openai/gpt-4o          # Strong reasoning fallback
openrouter:moonshotai/kimi-k2-0905  # Fast fallback
```

---

## Component-Specific Model Chains

Each component has a **model chain** - an ordered list of models where the system tries the primary first, then falls back to alternatives on failure.

### 1. Router Chain
**Purpose**: Classifies user intent and routes to appropriate handler

| Priority | Model | Reason |
|----------|-------|--------|
| Primary | `google:gemini-2.5-flash` | Fast routing decisions |
| Fallback | `openrouter:moonshotai/kimi-k2-0905` | Quick alternative |

**Configuration** (`config.py:59`):
```python
MODEL_CHAIN_ROUTER = "google:gemini-2.5-flash,openrouter:moonshotai/kimi-k2-0905"
```

### 2. Planner Chain
**Purpose**: Creates execution plans for complex multi-step tasks

| Priority | Model | Reason |
|----------|-------|--------|
| Primary | `google:gemini-2.5-flash` | Efficient planning |
| Fallback | `openrouter:openai/gpt-4o` | Strong reasoning for complex plans |

**Configuration** (`config.py:64`):
```python
MODEL_CHAIN_PLANNER = "google:gemini-2.5-flash,openrouter:openai/gpt-4o"
```

### 3. Agent Chain
**Purpose**: Executes individual tasks using tools

| Priority | Model | Reason |
|----------|-------|--------|
| Primary | `google:gemini-2.5-flash` | Fast task execution |
| Fallback | `openrouter:openai/gpt-4o` | Handles complex tool usage |

**Configuration** (`config.py:69`):
```python
MODEL_CHAIN_AGENT = "google:gemini-2.5-flash,openrouter:openai/gpt-4o"
```

### 4. Synthesizer Chain
**Purpose**: Combines results from multiple agents into coherent response

| Priority | Model | Reason |
|----------|-------|--------|
| Primary | `google:gemini-2.5-flash` | Quick synthesis |
| Fallback | `openrouter:moonshotai/kimi-k2-0905` | Fast alternative |

**Configuration** (`config.py:74`):
```python
MODEL_CHAIN_SYNTHESIZER = "google:gemini-2.5-flash,openrouter:moonshotai/kimi-k2-0905"
```

### 5. Memory Manager
**Purpose**: Extracts and stores user memories from conversations

| Model | Provider |
|-------|----------|
| `google:gemini-2.5-flash` | Google |

**Configuration** (`memory/service.py:26`):
```python
self.manager = MemoryManager(model=MODEL_ID, db=db)
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER REQUEST                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ROUTER AGENT                                 │
│  Primary: gemini-2.5-flash                                       │
│  Fallback: kimi-k2-0905                                          │
│  Purpose: Intent classification & routing                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────────┐
   │  DIRECT  │    │  SINGLE  │    │   COMPLEX    │
   │ RESPONSE │    │  AGENT   │    │   PLANNING   │
   └──────────┘    └────┬─────┘    └──────┬───────┘
                        │                  │
                        │                  ▼
                        │    ┌─────────────────────────────────┐
                        │    │        PLANNER AGENT            │
                        │    │  Primary: gemini-2.5-flash      │
                        │    │  Fallback: gpt-4o               │
                        │    │  Purpose: Create execution plan │
                        │    └──────────────┬──────────────────┘
                        │                   │
                        ▼                   ▼
              ┌─────────────────────────────────────────────────┐
              │              TASK AGENT(S)                       │
              │  Primary: gemini-2.5-flash                       │
              │  Fallback: gpt-4o                                │
              │  Purpose: Execute tools & tasks                  │
              └─────────────────────────┬───────────────────────┘
                                        │
                                        ▼
              ┌─────────────────────────────────────────────────┐
              │            SYNTHESIZER AGENT                     │
              │  Primary: gemini-2.5-flash                       │
              │  Fallback: kimi-k2-0905                          │
              │  Purpose: Combine results into final response    │
              └─────────────────────────┬───────────────────────┘
                                        │
                                        ▼
              ┌─────────────────────────────────────────────────┐
              │              MEMORY MANAGER                      │
              │  Model: gemini-2.5-flash                         │
              │  Purpose: Extract & store user memories          │
              └─────────────────────────────────────────────────┘
```

---

## API Keys Required

| Key | Provider | Purpose |
|-----|----------|---------|
| `GEMINI_API_KEY` | Google | Primary model access |
| `OPENROUTER_API_KEY` | OpenRouter | Fallback models (GPT-4o, Kimi K2) |

**Configuration in `.env`**:
```env
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

---

## Fallback Mechanism

### How It Works

1. System attempts request with **primary model**
2. If primary fails (API error, timeout, rate limit):
   - Log the failure
   - Switch to **fallback model**
   - Retry the request
3. Continue down the chain until success or all models exhausted

### Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `FALLBACK_ENABLED` | `true` | Enable/disable fallback system |
| `ROUTER_MAX_RETRIES` | `2` | Max retry attempts per model |
| `ROUTER_RETRY_DELAY` | `1.0` | Delay between retries (seconds) |
| `BLUEPRINT_MAX_RETRIES` | `2` | Max retries for blueprint generation |
| `BLUEPRINT_TIMEOUT_SECONDS` | `10` | Timeout per request |
| `BLUEPRINT_BACKOFF_MULTIPLIER` | `1.5` | Exponential backoff multiplier |

---

## Token Management

### Session Token Limits

| Component | Limit | Purpose |
|-----------|-------|---------|
| Router | 500 tokens | Keep routing context concise |
| Generator | 1000 tokens | Allow more context for task execution |

### Memory Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MEMORY_ENABLED` | `true` | Enable memory extraction |
| `MEMORY_READ_LIMIT` | `20` | Max memories to retrieve |
| `MEMORY_WRITE_ASYNC` | `true` | Async memory writes |

**Tokenizer**: Uses `tiktoken` with `cl100k_base` encoding (GPT-4 compatible)

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `config.py` | All model chains and configuration |
| `models/provider.py` | ModelChain class definitions |
| `agents/router.py` | Router agent with fallback logic |
| `agents/orchestrator.py` | Planner and execution with fallbacks |
| `agents/spawner.py` | Dynamic agent creation |
| `memory/service.py` | Memory manager initialization |

---

## Model Selection Rationale

### Why Gemini 2.5 Flash as Primary?
- **Speed**: Fastest response times among capable models
- **Cost**: Most cost-effective for high-volume requests
- **Quality**: Sufficient for most routing and task execution

### Why GPT-4o as Fallback for Complex Tasks?
- **Reasoning**: Superior performance on complex multi-step planning
- **Tool Use**: Better at complex tool orchestration
- **Reliability**: Strong fallback for edge cases

### Why Kimi K2 for Fast Fallbacks?
- **Speed**: Very fast inference times
- **Cost**: Budget-friendly alternative
- **Simplicity**: Good for straightforward routing/synthesis

---

## Dependencies

```
agno>=2.2.6          # Main orchestration framework
google-genai>=0.3.0  # Google Gemini SDK
openai>=1.0.0        # OpenAI SDK (for OpenRouter)
tiktoken>=0.5.0      # Token counting
```

---

## Summary Table

| Component | Primary | Fallback | Config Location |
|-----------|---------|----------|-----------------|
| Router | gemini-2.5-flash | kimi-k2-0905 | config.py:59 |
| Planner | gemini-2.5-flash | gpt-4o | config.py:64 |
| Task Agent | gemini-2.5-flash | gpt-4o | config.py:69 |
| Synthesizer | gemini-2.5-flash | kimi-k2-0905 | config.py:74 |
| Memory | gemini-2.5-flash | — | memory/service.py:26 |
