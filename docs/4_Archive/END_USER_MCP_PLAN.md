# End-User Friendly MCP Plan

## Problem

Current MCP servers (filesystem, git, fetch) are developer-focused. Need user-friendly alternatives for everyday productivity.

## Recommended End-User MCP Servers

### Tier 1: Easy Setup (Free, No OAuth)

| Server | Purpose | Install | API Key |
|--------|---------|---------|---------|
| **Brave Search** | Web search, news, images | `npx @anthropic/brave-search-mcp` | Free (2000/month) |
| **Tavily** | AI-optimized search | `uvx tavily-mcp` | Free (1000/month) |
| **Weather** | Weather forecasts | `uvx mcp-weather` | None (wttr.in) |

### Tier 2: OAuth Required (More Setup)

| Server | Purpose | Install | Setup |
|--------|---------|---------|-------|
| **Google Workspace** | Gmail, Calendar, Drive, Docs | `uvx workspace-mcp` | Google OAuth |
| **Notion** | Notes, databases, wikis | `npx @notionhq/notion-mcp` | Notion API key |
| **Spotify** | Music control, playlists | `uvx spotify-mcp` | Spotify OAuth |
| **Slack** | Messaging, channels | Via Rube | Slack OAuth |

### Tier 3: Advanced (Paid APIs)

| Server | Purpose | Cost |
|--------|---------|------|
| **Perplexity** | AI-powered search | Paid |
| **Exa AI** | Semantic search | Paid |
| **Firecrawl** | Web scraping | Paid |

## Recommended Stack for Non-Developers

```
Tier 1 (Start Here):
├── Brave Search  → Web search + news
├── Weather       → Daily forecasts
└── Filesystem    → Local file access

Tier 2 (Add Later):
├── Google Workspace → Email, calendar, docs
├── Notion           → Notes & knowledge base
└── Spotify          → Music control
```

## Implementation Plan

### Phase 1: Replace Current Setup

**Remove:**
- `mcp-server-git` (developer-only)
- `mcp-server-fetch` (replaced by Brave Search)

**Add:**
- Brave Search (web + news)
- Weather (daily use)

### Phase 2: Add Productivity Tools

1. **Get Brave API Key** (free)
   - Go to https://brave.com/search/api/
   - Sign up, get API key
   - Add to `.env`

2. **Update mcp_config.json**

```json
{
  "servers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "enabled": true,
      "description": "Read/write local files"
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      },
      "enabled": true,
      "description": "Web search, news, images"
    },
    "weather": {
      "command": "uvx",
      "args": ["mcp-server-weather"],
      "enabled": true,
      "description": "Weather forecasts"
    }
  }
}
```

### Phase 3: Add Google Workspace (Optional)

Requires OAuth setup:
1. Create Google Cloud project
2. Enable Gmail, Calendar, Drive APIs
3. Create OAuth credentials
4. Add to config

## Example Queries (After Implementation)

### Brave Search
```
> Search for best restaurants near me
> What's the latest news about AI?
> Find images of sunset beaches
> Search for Python tutorials
```

### Weather
```
> What's the weather today in New York?
> Will it rain tomorrow?
> Weather forecast for the week
```

### Google Workspace (if enabled)
```
> What's on my calendar today?
> Send an email to John about the meeting
> Find the document about project X
> Create a new event for tomorrow at 3pm
```

### Spotify (if enabled)
```
> Play my Discover Weekly playlist
> What song is playing?
> Add this song to my favorites
> Play something relaxing
```

## Next Steps

1. **Decision**: Which tier to implement?
   - [ ] Tier 1 only (easiest)
   - [ ] Tier 1 + Google Workspace
   - [ ] Full stack

2. **Action**: Get API keys
   - [ ] Brave Search API key
   - [ ] (Optional) Google OAuth credentials
   - [ ] (Optional) Notion API key

## References

- [Brave Search API](https://brave.com/search/api/)
- [Tavily MCP](https://www.pulsemcp.com/servers/tavily-search)
- [Google Workspace MCP](https://github.com/taylorwilsdon/google_workspace_mcp)
- [Awesome MCP Servers](https://github.com/wong2/awesome-mcp-servers)
- [MCP OmniSearch](https://github.com/spences10/mcp-omnisearch)
- [Spotify MCP](https://github.com/varunneal/spotify-mcp)
