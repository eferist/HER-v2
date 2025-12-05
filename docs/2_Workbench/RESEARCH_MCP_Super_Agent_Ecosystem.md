# MCP Super-Agent Ecosystem Research Report

> **Date:** December 2025
> **Purpose:** Comprehensive exploration of MCP servers to transform JIT Orchestrator into a SUPER-AGENT
> **Current State:** 4 MCP servers (brave-search, filesystem, weather, telegram)

---

## Executive Summary

The Model Context Protocol (MCP) ecosystem has exploded since Anthropic open-sourced it in November 2024. The global MCP server market is projected to reach **$10.3B in 2025**. With over **7,260+ MCP servers** catalogued across various repositories, the opportunity to build a truly powerful super-agent is immense.

This report categorizes the most valuable MCP servers for building a comprehensive AI agent that can:
- Search and browse the web
- Manage code and repositories
- Control cloud infrastructure
- Handle communications
- Process payments
- Manage tasks and projects
- Generate images and media
- Execute code safely
- And much more...

---

## Table of Contents

1. [Reference Servers (Official)](#1-reference-servers-official)
2. [Web & Search](#2-web--search)
3. [Code & Development](#3-code--development)
4. [Cloud Infrastructure](#4-cloud-infrastructure)
5. [Databases](#5-databases)
6. [Communication](#6-communication)
7. [Productivity & Project Management](#7-productivity--project-management)
8. [Knowledge & Notes](#8-knowledge--notes)
9. [Browser Automation](#9-browser-automation)
10. [Media & Creative](#10-media--creative)
11. [Payments & Finance](#11-payments--finance)
12. [Code Execution Sandboxes](#12-code-execution-sandboxes)
13. [RAG & Vector Databases](#13-rag--vector-databases)
14. [Recommendations for Super-Agent](#14-recommendations-for-super-agent)

---

## 1. Reference Servers (Official)

These are maintained by the MCP team and demonstrate best practices.

| Server | Description | Link |
|--------|-------------|------|
| **Everything** | Reference/test server with prompts, resources, and tools | [GitHub](https://github.com/modelcontextprotocol/servers) |
| **Fetch** | Web content fetching and conversion for efficient LLM usage | [GitHub](https://github.com/modelcontextprotocol/servers) |
| **Filesystem** | Secure file operations with configurable access controls | [GitHub](https://github.com/modelcontextprotocol/servers) |
| **Git** | Read, search, and manipulate Git repositories | [GitHub](https://github.com/modelcontextprotocol/servers) |
| **Memory** | Knowledge graph-based persistent memory system | [GitHub](https://github.com/modelcontextprotocol/servers) |
| **Sequential Thinking** | Dynamic and reflective problem-solving | [GitHub](https://github.com/modelcontextprotocol/servers) |

**Installation:**
```bash
npx -y @modelcontextprotocol/server-<name>
```

---

## 2. Web & Search

### Currently Have
- **brave-search** - Web search, news, local places

### Recommended Additions

| Server | Description | Priority | Setup |
|--------|-------------|----------|-------|
| **Firecrawl** | Powerful web scraping with 83% accuracy, 7s avg response | HIGH | API Key |
| **Bright Data** | 100% success rate, CAPTCHA solving, proxy rotation | HIGH | API Key |
| **Crawl4AI** | LLM-based content extraction with smart_extract | MEDIUM | Docker |
| **Exa** | AI-native search with neural search capabilities | MEDIUM | API Key |

**Firecrawl Setup:**
```json
{
  "firecrawl": {
    "command": "npx",
    "args": ["-y", "@anthropic/firecrawl-mcp-server"],
    "env": {
      "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}"
    }
  }
}
```

---

## 3. Code & Development

### GitHub (ESSENTIAL)

The official GitHub MCP server is a game-changer for development workflows.

| Feature | Capability |
|---------|------------|
| Repository Management | Browse, query code, search files, analyze commits |
| Issue & PR Automation | Create, update, manage issues and PRs |
| CI/CD Intelligence | Monitor Actions, analyze failures, manage releases |
| Code Analysis | Security findings, Dependabot alerts, code patterns |
| GitHub Projects | Full project board management (Oct 2025 update) |

**Setup:**
```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@github/mcp-server"],
    "env": {
      "GITHUB_TOKEN": "${GITHUB_TOKEN}"
    }
  }
}
```

### Git (Local)
```json
{
  "git": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-git"]
  }
}
```

### GitMCP
Alternative that creates MCP server for any GitHub project - just replace `github.com` with `gitmcp.io` in any repo URL.

---

## 4. Cloud Infrastructure

### AWS MCP Server (Official - July 2025)

| Capability | Description |
|------------|-------------|
| Natural Language | Interact with ANY AWS API via natural language |
| CLI Generation | Creates syntactically correct CLI commands |
| IAM Integration | Secure access through IAM credentials |
| Resource Management | Inspect, create, modify AWS resources |

**Setup:**
```json
{
  "aws": {
    "command": "npx",
    "args": ["-y", "@aws/mcp-server"],
    "env": {
      "AWS_ACCESS_KEY_ID": "${AWS_ACCESS_KEY_ID}",
      "AWS_SECRET_ACCESS_KEY": "${AWS_SECRET_ACCESS_KEY}",
      "AWS_REGION": "${AWS_REGION}"
    }
  }
}
```

### Azure MCP Server (Microsoft)

Single unified server for 40+ Azure services including:
- CosmosDB, SQL, SharePoint
- Azure CLI integration
- AKS (Kubernetes) management
- Azure DevOps

**Setup:**
```json
{
  "azure": {
    "command": "npx",
    "args": ["-y", "@azure/mcp-server"],
    "env": {
      "AZURE_SUBSCRIPTION_ID": "${AZURE_SUBSCRIPTION_ID}"
    }
  }
}
```

### Kubernetes MCP Server

Native Go implementation (not kubectl wrapper) with:
- Direct Kubernetes API interaction
- Multi-cluster management
- Low latency operations

**Setup:**
```json
{
  "kubernetes": {
    "command": "npx",
    "args": ["-y", "@containers/kubernetes-mcp-server"]
  }
}
```

### Docker/Portainer

```json
{
  "portainer": {
    "command": "npx",
    "args": ["-y", "portainer-mcp-server"],
    "env": {
      "PORTAINER_URL": "${PORTAINER_URL}",
      "PORTAINER_API_KEY": "${PORTAINER_API_KEY}"
    }
  }
}
```

### Terraform Cloud

```json
{
  "terraform": {
    "command": "npx",
    "args": ["-y", "terraform-cloud-mcp-server"],
    "env": {
      "TFC_TOKEN": "${TFC_TOKEN}"
    }
  }
}
```

---

## 5. Databases

### Multi-Database Servers

| Server | Databases Supported | Features |
|--------|---------------------|----------|
| **executeautomation/mcp-database-server** | SQLite, SQL Server, PostgreSQL, MySQL | Query execution, schema inspection |
| **MCP Alchemy** | PostgreSQL, MySQL, MariaDB, SQLite, Oracle, MS SQL, CrateDB, Vertica | SQLAlchemy-compatible |
| **Legion MCP** | PostgreSQL, Redshift, CockroachDB, MySQL, RDS, BigQuery, Oracle, SQLite | Universal database server |

### PostgreSQL Pro

```json
{
  "postgres": {
    "command": "npx",
    "args": ["-y", "postgres-mcp-pro"],
    "env": {
      "DATABASE_URL": "${DATABASE_URL}"
    }
  }
}
```

Features:
- Database health analysis
- Index tuning (explores thousands of possibilities)
- Query plan analysis with EXPLAIN
- Schema intelligence for context-aware SQL
- Safe SQL execution with access control

### SQLite Enhanced (v2.6.3)

73 specialized tools including:
- Vector Search
- FTS5 full-text search
- JSONB support
- SpatiaLite (geospatial)
- Statistical analysis

---

## 6. Communication

### Currently Have
- **telegram** - Messages, contacts, groups

### Recommended Additions

| Server | Platform | Features | Priority |
|--------|----------|----------|----------|
| **Slack** | Slack | Channels, messages, presence, threads | HIGH |
| **Discord** | Discord | Full CRUD on channels, forums, messages | MEDIUM |
| **Twilio** | SMS/WhatsApp | Send messages, phone management | HIGH |
| **SendGrid** | Email | AI email workflows | MEDIUM |

### Slack MCP Server

```json
{
  "slack": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-slack"],
    "env": {
      "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
      "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
    }
  }
}
```

### Twilio (Official)

```json
{
  "twilio": {
    "command": "npx",
    "args": ["-y", "twilio-mcp-server"],
    "env": {
      "TWILIO_ACCOUNT_SID": "${TWILIO_ACCOUNT_SID}",
      "TWILIO_AUTH_TOKEN": "${TWILIO_AUTH_TOKEN}"
    }
  }
}
```

---

## 7. Productivity & Project Management

### Google Workspace (COMPREHENSIVE)

The `google_workspace_mcp` by taylorwilsdon is the most feature-complete:

| Service | Capabilities |
|---------|--------------|
| Gmail | Send, receive, search, attachments |
| Calendar | Events, scheduling, free/busy |
| Drive | Files, folders, sharing |
| Docs | Read, write, collaborate |
| Sheets | Data manipulation |
| Forms | Form management |
| Tasks | Task lists |
| Chat | Messaging |

```json
{
  "google-workspace": {
    "command": "npx",
    "args": ["-y", "google-workspace-mcp"],
    "env": {
      "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
      "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}"
    }
  }
}
```

### Task Management

| Server | Platform | Priority |
|--------|----------|----------|
| **Todoist** | Todoist | HIGH |
| **ClickUp** | ClickUp (170+ tools!) | HIGH |
| **Trello** | Trello | MEDIUM |
| **Linear** | Linear | MEDIUM |
| **Jira** | Jira | HIGH |
| **Notion** | Notion | HIGH |

### Notion MCP (Official)

```json
{
  "notion": {
    "command": "npx",
    "args": ["-y", "@notionhq/mcp-server"],
    "env": {
      "NOTION_API_KEY": "${NOTION_API_KEY}"
    }
  }
}
```

### Linear + Jira (DX Heroes)

```json
{
  "jira-linear": {
    "command": "npx",
    "args": ["-y", "@dxheroes/jira-linear-mcp"],
    "env": {
      "JIRA_API_TOKEN": "${JIRA_API_TOKEN}",
      "LINEAR_API_KEY": "${LINEAR_API_KEY}"
    }
  }
}
```

---

## 8. Knowledge & Notes

### Obsidian MCP Server

Transform your Obsidian vault into an AI-accessible knowledge base.

| Feature | Description |
|---------|-------------|
| Note Access | Read, write, search notes |
| Tagging | Manage tags and frontmatter |
| Semantic Search | AI-powered search across vault |
| Auto-organization | Restructure folders, auto-tag |

```json
{
  "obsidian": {
    "command": "python",
    "args": ["-m", "obsidian_mcp"],
    "env": {
      "OBSIDIAN_VAULT_PATH": "${OBSIDIAN_VAULT_PATH}"
    }
  }
}
```

### Memory Server (Official)

Knowledge graph-based persistent memory:

```json
{
  "memory": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"]
  }
}
```

---

## 9. Browser Automation

### Playwright MCP (Microsoft Official)

| Feature | Benefit |
|---------|---------|
| Accessibility Tree | No vision models needed |
| Fast & Lightweight | Direct structured data |
| Deterministic | Avoids screenshot ambiguity |

```json
{
  "playwright": {
    "command": "npx",
    "args": ["-y", "@playwright/mcp@latest"]
  }
}
```

### Puppeteer MCP

```json
{
  "puppeteer": {
    "command": "npx",
    "args": ["-y", "puppeteer-mcp-server"]
  }
}
```

### Browserbase (Cloud)

Cloud browser automation with:
- Web navigation
- Data extraction
- Form filling
- Screenshot capture

---

## 10. Media & Creative

### Image Generation

| Server | Provider | Features |
|--------|----------|----------|
| **ImageGen MCP** | Multi-provider | Unified access to DALL-E, Midjourney, Stable Diffusion |
| **DALL-E MCP** | OpenAI | Best prompt adherence, text rendering |
| **Midjourney MCP** | Midjourney | Artistic coherence, cinematic quality |
| **Stability AI MCP** | Stability AI | Generate, edit, upscale |

### Stability AI Setup

```json
{
  "stability-ai": {
    "command": "npx",
    "args": ["-y", "mcp-server-stability-ai"],
    "env": {
      "STABILITY_API_KEY": "${STABILITY_API_KEY}"
    }
  }
}
```

### Spotify

```json
{
  "spotify": {
    "command": "npx",
    "args": ["-y", "spotify-mcp-server"],
    "env": {
      "SPOTIFY_CLIENT_ID": "${SPOTIFY_CLIENT_ID}",
      "SPOTIFY_CLIENT_SECRET": "${SPOTIFY_CLIENT_SECRET}"
    }
  }
}
```

Features: OAuth 2.0 + PKCE, playback control, search, playlists

### YouTube

Transcript retrieval, captions, subtitle access

---

## 11. Payments & Finance

### Stripe MCP (Official)

Over 700 AI-agent startups have launched on Stripe using MCP.

| Capability | Description |
|------------|-------------|
| Customer Management | Create, retrieve, update |
| Payment Intents | Create payments |
| Charges | List and manage |
| Refunds | Process refunds |
| Subscriptions | Manage recurring billing |

```json
{
  "stripe": {
    "command": "npx",
    "args": ["-y", "stripe-agent-toolkit"],
    "env": {
      "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}"
    }
  }
}
```

**Security Note:** Use restricted API keys and enable human confirmation.

---

## 12. Code Execution Sandboxes

### E2B Code Sandbox (RECOMMENDED)

Secure cloud-based code execution:

```json
{
  "e2b": {
    "command": "npx",
    "args": ["-y", "@e2b/mcp-server"],
    "env": {
      "E2B_API_KEY": "${E2B_API_KEY}"
    }
  }
}
```

Features:
- Isolated sandbox environments
- Auto chart extraction (matplotlib)
- 100 free credits on signup

### Pydantic mcp-run-python

WebAssembly sandbox via Pyodide in Deno:

```json
{
  "python-sandbox": {
    "command": "npx",
    "args": ["-y", "@pydantic/mcp-run-python"]
  }
}
```

### Local Code Sandbox

Docker-based isolation:

```json
{
  "code-sandbox": {
    "command": "npx",
    "args": ["-y", "mcp-code-sandbox"]
  }
}
```

---

## 13. RAG & Vector Databases

### Pinecone MCP

```json
{
  "pinecone": {
    "command": "npx",
    "args": ["-y", "pinecone-mcp-server"],
    "env": {
      "PINECONE_API_KEY": "${PINECONE_API_KEY}"
    }
  }
}
```

### Vector DB Comparison (2025)

| Database | Best For | Latency (1B vectors) |
|----------|----------|---------------------|
| **Pinecone** | Enterprise RAG, zero DevOps | ~47ms p99 |
| **Weaviate** | Hybrid search, schema flexibility | ~123ms p99 |
| **Chroma** | Local prototypes, startups | Local |
| **Qdrant** | Self-hosted, high performance | Variable |

---

## 14. Recommendations for Super-Agent

### Tier 1: Essential (Add Immediately)

| Server | Why Essential | Complexity |
|--------|---------------|------------|
| **GitHub** | Code management, PRs, issues | Low (API Key) |
| **Playwright** | Web automation without vision | Low (npx) |
| **E2B** | Safe code execution | Low (API Key) |
| **Slack** | Team communication | Medium (OAuth) |
| **Google Workspace** | Email, calendar, docs | Medium (OAuth) |

### Tier 2: High Value (Add Soon)

| Server | Why Valuable | Complexity |
|--------|--------------|------------|
| **Firecrawl** | Best web scraping | Low (API Key) |
| **Notion** | Knowledge management | Low (API Key) |
| **PostgreSQL Pro** | Database intelligence | Low (Connection string) |
| **Stripe** | Payment processing | Medium (Restricted keys) |
| **AWS/Azure** | Cloud management | Medium (IAM/Azure creds) |

### Tier 3: Nice to Have

| Server | Use Case | Complexity |
|--------|----------|------------|
| **Obsidian** | Personal knowledge base | Medium |
| **Stability AI** | Image generation | Low |
| **Todoist/ClickUp** | Task management | Low |
| **Kubernetes** | Container orchestration | High |
| **Pinecone** | RAG/vector search | Medium |

---

## Proposed Super-Agent Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SUPER-AGENT                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   SEARCH    │  │    CODE     │  │   CLOUD     │     │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤     │
│  │ brave-search│  │ github      │  │ aws         │     │
│  │ firecrawl   │  │ git         │  │ azure       │     │
│  │ exa         │  │ e2b         │  │ kubernetes  │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   COMMS     │  │ PRODUCTIVITY│  │   DATA      │     │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤     │
│  │ telegram    │  │ google-ws   │  │ postgres    │     │
│  │ slack       │  │ notion      │  │ pinecone    │     │
│  │ twilio      │  │ todoist     │  │ sqlite      │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  BROWSER    │  │   MEDIA     │  │  PAYMENTS   │     │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤     │
│  │ playwright  │  │ stability   │  │ stripe      │     │
│  │ puppeteer   │  │ spotify     │  │             │     │
│  │ browserbase │  │ youtube     │  │             │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Updated mcp_config.json Template

```json
{
  "servers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": { "BRAVE_API_KEY": "${BRAVE_API_KEY}" },
      "enabled": true,
      "description": "Web search, news, local places"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "enabled": true,
      "description": "Read/write local files"
    },
    "weather": {
      "command": "python",
      "args": ["-m", "mcp_weather_server"],
      "enabled": true,
      "description": "Weather, air quality, timezone data"
    },
    "telegram": {
      "command": "uv",
      "args": ["--directory", "telegram-mcp", "run", "main.py"],
      "env": {
        "TELEGRAM_API_ID": "${TELEGRAM_API_ID}",
        "TELEGRAM_API_HASH": "${TELEGRAM_API_HASH}",
        "TELEGRAM_SESSION_STRING": "${TELEGRAM_SESSION_STRING}"
      },
      "enabled": true,
      "description": "Telegram messages, contacts, groups"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@github/mcp-server"],
      "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" },
      "enabled": false,
      "description": "Repository management, PRs, issues, Actions"
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "enabled": false,
      "description": "Browser automation via accessibility tree"
    },
    "e2b": {
      "command": "npx",
      "args": ["-y", "@e2b/mcp-server"],
      "env": { "E2B_API_KEY": "${E2B_API_KEY}" },
      "enabled": false,
      "description": "Secure cloud code execution sandbox"
    },
    "slack": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
        "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
      },
      "enabled": false,
      "description": "Slack channels, messages, presence"
    },
    "google-workspace": {
      "command": "npx",
      "args": ["-y", "google-workspace-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
        "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}"
      },
      "enabled": false,
      "description": "Gmail, Calendar, Drive, Docs, Sheets"
    },
    "notion": {
      "command": "npx",
      "args": ["-y", "@notionhq/mcp-server"],
      "env": { "NOTION_API_KEY": "${NOTION_API_KEY}" },
      "enabled": false,
      "description": "Notion pages, databases, workspaces"
    },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp-server"],
      "env": { "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}" },
      "enabled": false,
      "description": "Web scraping and crawling"
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "postgres-mcp-pro"],
      "env": { "DATABASE_URL": "${DATABASE_URL}" },
      "enabled": false,
      "description": "PostgreSQL with health analysis and tuning"
    },
    "stripe": {
      "command": "npx",
      "args": ["-y", "stripe-agent-toolkit"],
      "env": { "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}" },
      "enabled": false,
      "description": "Payment processing, customers, refunds"
    },
    "stability-ai": {
      "command": "npx",
      "args": ["-y", "mcp-server-stability-ai"],
      "env": { "STABILITY_API_KEY": "${STABILITY_API_KEY}" },
      "enabled": false,
      "description": "Image generation, editing, upscaling"
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "enabled": false,
      "description": "Knowledge graph-based persistent memory"
    }
  },
  "settings": {
    "connect_on_startup": true,
    "skip_failed_servers": true,
    "connection_timeout": 30
  }
}
```

---

## Security Considerations

1. **API Key Management**: Use restricted keys with minimal permissions
2. **Human Confirmation**: Enable for sensitive operations (payments, deletions)
3. **Prompt Injection**: Be cautious when combining multiple MCP servers
4. **Data Exposure**: Review what data each server can access
5. **Credential Isolation**: Never share database credentials directly

---

## Resources

### Official
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
- [MCP Documentation](https://modelcontextprotocol.io/examples)
- [Microsoft MCP Catalog](https://github.com/microsoft/mcp)

### Community Lists
- [awesome-mcp-servers (punkpeye)](https://github.com/punkpeye/awesome-mcp-servers)
- [awesome-mcp-servers (wong2)](https://github.com/wong2/awesome-mcp-servers)
- [TensorBlock Collection](https://github.com/TensorBlock/awesome-mcp-servers) - 7,260+ servers
- [awesome-devops-mcp-servers](https://github.com/rohitg00/awesome-devops-mcp-servers)

### Marketplaces
- [mcp.so](https://mcp.so/)
- [PulseMCP](https://www.pulsemcp.com/)
- [MCP Servers Registry](https://mcpservers.org/)

---

## Next Steps

1. **Phase 1**: Add GitHub + Playwright + E2B (code-focused super-agent)
2. **Phase 2**: Add Slack + Google Workspace (productivity)
3. **Phase 3**: Add Firecrawl + Notion (knowledge management)
4. **Phase 4**: Add cloud providers as needed (AWS/Azure)
5. **Phase 5**: Add payments + media generation (full capabilities)

---

*This research compiled from official documentation, GitHub repositories, and web searches as of December 2025.*
