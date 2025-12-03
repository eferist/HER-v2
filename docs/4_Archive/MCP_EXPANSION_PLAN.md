# MCP Expansion Plan

## Current State

| Server | Status | Setup |
|--------|--------|-------|
| weather | ✅ Working | None needed |
| filesystem | ✅ Working | None needed |
| brave-search | ⚠️ Needs key | API key (free) |

## Expansion Tiers

### Tier 1: API Key Only (Easy)

| Server | Purpose | Setup | Package |
|--------|---------|-------|---------|
| **Notion** | Notes, databases, wikis | API key from notion.so/my-integrations | `npx @notionhq/notion-mcp-server` |
| **Brave Search** | Web search, news | API key from brave.com/search/api | Already configured |

**User effort**: Copy-paste one token

### Tier 2: OAuth Required (Medium)

| Server | Purpose | Setup Required |
|--------|---------|----------------|
| **Google Workspace** | Gmail, Calendar, Drive, Docs | Google Cloud project + OAuth credentials |
| **Spotify** | Music control, playlists | Spotify Developer app + OAuth |
| **GitHub** | Repos, issues, PRs | GitHub OAuth app |

**User effort**:
1. Create developer app
2. Get Client ID + Secret
3. Run one-time auth flow
4. Token stored locally

### Tier 3: Complex OAuth (Hard)

| Server | Purpose | Why Harder |
|--------|---------|------------|
| **Slack** | Messaging, channels | Workspace admin approval needed |
| **Microsoft 365** | Outlook, Teams, OneDrive | Azure AD setup |
| **Discord** | Server messages, bots | Bot permissions setup |

**User effort**: More permissions, admin approvals

---

## Implementation Plan

### Phase 1: Notion (Simple API Key)

**Changes needed:**
1. Add to `mcp_config.json`
2. Add `NOTION_API_KEY` to `.env.example`
3. Test

**Config:**
```json
"notion": {
  "command": "npx",
  "args": ["-y", "@notionhq/notion-mcp-server"],
  "env": {
    "OPENAPI_MCP_HEADERS": "{\"Authorization\": \"Bearer ${NOTION_API_KEY}\", \"Notion-Version\": \"2022-06-28\"}"
  },
  "enabled": true,
  "description": "Notion pages, databases, notes"
}
```

**Example queries:**
- "Find my notes about project X"
- "Create a new page called Meeting Notes"
- "What's in my Tasks database?"

---

### Phase 2: Google Workspace (OAuth)

**Setup steps for user:**
1. Go to console.cloud.google.com
2. Create project
3. Enable Gmail, Calendar, Drive APIs
4. Create OAuth credentials (Desktop app)
5. Download `client_secret.json`
6. Run auth flow once: `uvx workspace-mcp --auth`

**Changes needed:**
1. Add to `mcp_config.json`
2. Add Google env vars to `.env.example`
3. Document setup in README or separate guide

**Config:**
```json
"google": {
  "command": "uvx",
  "args": ["workspace-mcp"],
  "env": {
    "GOOGLE_OAUTH_CLIENT_ID": "${GOOGLE_OAUTH_CLIENT_ID}",
    "GOOGLE_OAUTH_CLIENT_SECRET": "${GOOGLE_OAUTH_CLIENT_SECRET}"
  },
  "enabled": false,
  "description": "Gmail, Calendar, Drive, Docs (requires OAuth setup)"
}
```

**Example queries:**
- "What's on my calendar today?"
- "Send an email to John about the meeting"
- "Find documents about Q4 budget"
- "Create a calendar event for tomorrow at 3pm"

---

### Phase 3: Spotify (OAuth)

**Setup steps for user:**
1. Go to developer.spotify.com/dashboard
2. Create app
3. Get Client ID + Secret
4. Add redirect URI: `http://127.0.0.1:8080/callback`
5. Run auth flow once

**Changes needed:**
1. Add to `mcp_config.json`
2. Add Spotify env vars to `.env.example`

**Config:**
```json
"spotify": {
  "command": "uvx",
  "args": ["spotify-mcp"],
  "env": {
    "SPOTIFY_CLIENT_ID": "${SPOTIFY_CLIENT_ID}",
    "SPOTIFY_CLIENT_SECRET": "${SPOTIFY_CLIENT_SECRET}",
    "SPOTIFY_REDIRECT_URI": "http://127.0.0.1:8080/callback"
  },
  "enabled": false,
  "description": "Spotify playback, playlists (requires OAuth setup)"
}
```

**Example queries:**
- "What song is playing?"
- "Play my Discover Weekly"
- "Add this song to my favorites"
- "Play something relaxing"

---

### Phase 4: GitHub (OAuth)

**Setup steps for user:**
1. Go to github.com/settings/developers
2. Create OAuth app
3. Get Client ID + Secret

**Config:**
```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
  },
  "enabled": false,
  "description": "GitHub repos, issues, PRs"
}
```

**Example queries:**
- "Show my open pull requests"
- "Create an issue for bug fix"
- "What repos did I update recently?"

---

## Final Config Structure

```json
{
  "servers": {
    "weather": { "enabled": true, ... },
    "filesystem": { "enabled": true, ... },
    "brave-search": { "enabled": true, ... },
    "notion": { "enabled": false, ... },
    "google": { "enabled": false, ... },
    "spotify": { "enabled": false, ... },
    "github": { "enabled": false, ... }
  }
}
```

Users enable what they need by:
1. Setting up credentials
2. Adding to `.env`
3. Setting `"enabled": true` in config

---

## Documentation Needed

1. **SETUP_NOTION.md** - Simple API key guide
2. **SETUP_GOOGLE.md** - OAuth setup walkthrough
3. **SETUP_SPOTIFY.md** - OAuth setup walkthrough
4. **SETUP_GITHUB.md** - Token/OAuth guide

---

## Questions to Decide

1. **Start with which phase?**
   - Phase 1 (Notion) - easiest
   - Phase 1 + 2 (Notion + Google) - most useful
   - All phases - complete but more work

2. **Create setup docs now or later?**

3. **Default enabled or disabled?**
   - Recommend: disabled by default, user enables after setup
