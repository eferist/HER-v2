# MCP Tools Implementation Plan

## Overview

Integrate tools from `TOOL_LOGIC_BLUEPRINT.md` into the JIT Orchestrator using **existing community MCP servers** where available, and only building custom servers when necessary.

## Strategy: Use Existing > Build Custom

| Tool | Strategy | Source | Notes |
|------|----------|--------|-------|
| DuckDuckGo | ❌ **Skip** | N/A | Already have Brave Search |
| Telegram Bot | ❌ **Skip** | N/A | Telethon MCP covers this |
| Telegram (Telethon) | ✅ **Use existing** | [dryeab/mcp-telegram](https://github.com/dryeab/mcp-telegram) | Full-featured, PyPI package |
| Spotify | ✅ **Use existing** | [varunneal/spotify-mcp](https://github.com/varunneal/spotify-mcp) | Requires Premium |
| Google Calendar | ✅ **Use existing** | [nspady/google-calendar-mcp](https://github.com/nspady/google-calendar-mcp) | Most popular, multi-calendar |
| OpenWeather | ✅ **Use existing** | [openweather-mcp (PyPI)](https://pypi.org/project/openweather-mcp/) | Simple, works |
| Geoapify | ✅ **Use existing** | [orishmila/geoapify-mcp-server](https://github.com/orishmila/geoapify-mcp-server) | 14 tools, full POI |
| WebFetch | ⚠️ **Evaluate** | Check for `fetch` MCP | May need custom |
| Cron Scheduler | 🔧 **Build custom** | N/A | Unique requirement |

---

## Phase 1: Install Existing MCP Servers

### 1.1 Telegram (Telethon) - `mcp-telegram`

**Source:** https://github.com/dryeab/mcp-telegram

**Install:**
```bash
pip install mcp-telegram
```

**Tools provided:**
- `send_message` - Send message to any chat
- `edit_message` - Edit existing message
- `delete_messages` - Delete messages
- `search_messages` - Search in chats
- `get_dialogs` - List all chats
- `get_chat_history` - Read messages
- `get_contacts` - List contacts
- `manage_drafts` - Draft management

**Config (`mcp_config.json`):**
```json
{
  "telegram": {
    "command": "mcp-telegram",
    "args": [],
    "env": {
      "TELEGRAM_API_ID": "${TELEGRAM_API_ID}",
      "TELEGRAM_API_HASH": "${TELEGRAM_API_HASH}"
    },
    "enabled": false
  }
}
```

**Auth:** Run first-time auth to create session:
```bash
mcp-telegram --auth
```

---

### 1.2 Spotify - `spotify-mcp`

**Source:** https://github.com/varunneal/spotify-mcp

**Install:**
```bash
pip install spotify-mcp
```

**Tools provided:**
- `search` - Search tracks, albums, artists
- `get_playback_state` - Current playback info
- `start_playback` - Play track/playlist
- `pause_playback` - Pause
- `skip_to_next` - Next track
- `skip_to_previous` - Previous track
- `get_user_playlists` - List user playlists
- `get_queue` - Current queue

**Config (`mcp_config.json`):**
```json
{
  "spotify": {
    "command": "spotify-mcp",
    "args": [],
    "env": {
      "SPOTIFY_CLIENT_ID": "${SPOTIFY_CLIENT_ID}",
      "SPOTIFY_CLIENT_SECRET": "${SPOTIFY_CLIENT_SECRET}",
      "SPOTIFY_REDIRECT_URI": "${SPOTIFY_REDIRECT_URI}"
    },
    "enabled": false
  }
}
```

**Requirements:**
- Spotify Premium account
- Create app at https://developer.spotify.com/dashboard

**Auth:** First run triggers OAuth flow in browser.

---

### 1.3 Google Calendar - `google-calendar-mcp`

**Source:** https://github.com/nspady/google-calendar-mcp

**Install:**
```bash
npm install -g @nspady/google-calendar-mcp
```

**Tools provided:**
- `list_calendars` - List all calendars
- `list_events` - Get events from calendar
- `create_event` - Create new event
- `update_event` - Modify existing event
- `delete_event` - Remove event
- `find_free_time` - Find available slots
- `quick_add` - Natural language event creation

**Config (`mcp_config.json`):**
```json
{
  "google-calendar": {
    "command": "npx",
    "args": ["-y", "@nspady/google-calendar-mcp"],
    "env": {
      "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
      "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}"
    },
    "enabled": false
  }
}
```

**Setup:**
1. Create OAuth credentials at Google Cloud Console
2. Enable Google Calendar API
3. First run triggers OAuth flow

---

### 1.4 OpenWeather - `openweather-mcp`

**Source:** https://pypi.org/project/openweather-mcp/

**Install:**
```bash
pip install openweather-mcp
```

**Tools provided:**
- `get_current_weather` - Current weather for city
- `get_forecast` - 5-day forecast

**Config (`mcp_config.json`):**
```json
{
  "openweather": {
    "command": "openweather-mcp",
    "args": [],
    "env": {
      "OPENWEATHER_API_KEY": "${OPENWEATHER_API_KEY}"
    },
    "enabled": false
  }
}
```

**Setup:**
- Get free API key at https://openweathermap.org/api

---

### 1.5 Geoapify - `geoapify-mcp-server`

**Source:** https://github.com/orishmila/geoapify-mcp-server

**Install:**
```bash
npm install -g geoapify-mcp-server
```

**Tools provided (14 total):**
- `places_search` - Search POIs by category
- `place_details` - Get place details
- `forward_geocoding` - Address to coordinates
- `reverse_geocoding` - Coordinates to address
- `suggest_places` - Autocomplete suggestions
- `routing` - Get directions
- `isochrones` - Travel time areas
- And more...

**Config (`mcp_config.json`):**
```json
{
  "geoapify": {
    "command": "npx",
    "args": ["-y", "geoapify-mcp-server"],
    "env": {
      "GEOAPIFY_KEY": "${GEOAPIFY_API_KEY}"
    },
    "enabled": false
  }
}
```

**Setup:**
- Get free API key at https://geoapify.com (3000 credits/day free)

---

## Phase 2: Evaluate WebFetch

Need to check if there's an existing `fetch` or `web-fetch` MCP server.

**Options:**
1. Use existing if available
2. Build simple custom server if not

**If building custom:**
```
src/mcp_servers/
└── webfetch_server.py
```

**Tools needed:**
- `fetch_url(url)` - Fetch and extract content from URL
- `fetch_from_search_results(json)` - Extract URLs from search results and fetch

---

## Phase 3: Build Custom - Cron Scheduler

This is unique to our use case. No existing MCP server provides this.

**File structure:**
```
src/mcp_servers/
├── cron_server.py
└── scheduler/
    ├── __init__.py
    ├── time_parser.py
    └── models.py
```

**Tools:**
- `preview_schedule(prompt, time, name)` - Preview without creating
- `schedule(prompt, time, name)` - Create job
- `list_schedules()` - List all jobs
- `delete_schedule(job_id)` - Delete job

**Key features:**
- SQLite persistence (`tmp/scheduler.db`)
- Natural language time parsing ("in 10 minutes", "5am daily")
- Cron expression support
- Two-step workflow: preview → confirm

**Note:** Requires external daemon to poll and execute due jobs.

**Config (`mcp_config.json`):**
```json
{
  "cron": {
    "command": "python",
    "args": ["-m", "src.mcp_servers.cron_server"],
    "enabled": false
  }
}
```

---

## Phase 4: Integration

### 4.1 Update `mcp_config.json`

Final config with all servers:

```json
{
  "servers": {
    "weather": {
      "command": "npx",
      "args": ["-y", "@philschmid/weather-mcp"],
      "enabled": true,
      "description": "Weather forecasts"
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-filesystem", "/home/user"],
      "enabled": true,
      "description": "Read/write files"
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-brave-search"],
      "env": { "BRAVE_API_KEY": "${BRAVE_API_KEY}" },
      "enabled": true,
      "description": "Web search"
    },
    "telegram": {
      "command": "mcp-telegram",
      "args": [],
      "env": {
        "TELEGRAM_API_ID": "${TELEGRAM_API_ID}",
        "TELEGRAM_API_HASH": "${TELEGRAM_API_HASH}"
      },
      "enabled": false,
      "description": "Telegram messaging"
    },
    "spotify": {
      "command": "spotify-mcp",
      "args": [],
      "env": {
        "SPOTIFY_CLIENT_ID": "${SPOTIFY_CLIENT_ID}",
        "SPOTIFY_CLIENT_SECRET": "${SPOTIFY_CLIENT_SECRET}",
        "SPOTIFY_REDIRECT_URI": "${SPOTIFY_REDIRECT_URI}"
      },
      "enabled": false,
      "description": "Music control (Premium required)"
    },
    "google-calendar": {
      "command": "npx",
      "args": ["-y", "@nspady/google-calendar-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
        "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}"
      },
      "enabled": false,
      "description": "Calendar management"
    },
    "openweather": {
      "command": "openweather-mcp",
      "args": [],
      "env": {
        "OPENWEATHER_API_KEY": "${OPENWEATHER_API_KEY}"
      },
      "enabled": false,
      "description": "Weather data (alternative)"
    },
    "geoapify": {
      "command": "npx",
      "args": ["-y", "geoapify-mcp-server"],
      "env": {
        "GEOAPIFY_KEY": "${GEOAPIFY_API_KEY}"
      },
      "enabled": false,
      "description": "Places, geocoding, routing"
    },
    "cron": {
      "command": "python",
      "args": ["-m", "src.mcp_servers.cron_server"],
      "enabled": false,
      "description": "Task scheduling"
    }
  },
  "settings": {
    "connect_on_startup": true,
    "skip_failed_servers": true,
    "connection_timeout": 30
  }
}
```

### 4.2 Update `.env.example`

```bash
# Required - LLM APIs
GOOGLE_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key

# Brave Search (already configured)
BRAVE_API_KEY=your-brave-key

# Telegram (Telethon)
TELEGRAM_API_ID=from-my-telegram-org
TELEGRAM_API_HASH=from-my-telegram-org

# Spotify (Premium required)
SPOTIFY_CLIENT_ID=from-developer-spotify
SPOTIFY_CLIENT_SECRET=from-developer-spotify
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback

# Google Calendar
GOOGLE_CLIENT_ID=from-cloud-console
GOOGLE_CLIENT_SECRET=from-cloud-console

# OpenWeather (alternative to default weather)
OPENWEATHER_API_KEY=from-openweathermap

# Geoapify
GEOAPIFY_API_KEY=from-geoapify
```

### 4.3 Update `docs/MCP_SETUP_GUIDE.md`

Add setup instructions for each new server.

---

## Implementation Order

| Order | Task | Effort | Priority |
|-------|------|--------|----------|
| 1 | Install & test `openweather-mcp` | Low | High |
| 2 | Install & test `geoapify-mcp-server` | Low | Medium |
| 3 | Install & test `mcp-telegram` | Medium | Medium |
| 4 | Install & test `spotify-mcp` | Medium | Low |
| 5 | Install & test `google-calendar-mcp` | Medium | Low |
| 6 | Evaluate WebFetch options | Low | Medium |
| 7 | Build custom Cron server | High | Low |

---

## Dependencies to Add

```txt
# Add to requirements.txt
mcp-telegram>=0.1.0         # Telegram (Telethon)
spotify-mcp>=0.1.0          # Spotify
openweather-mcp>=0.1.0      # OpenWeather

# For custom cron server only
croniter>=2.0.0             # Cron expression parsing
```

**NPM packages (installed via npx on first run):**
- `@nspady/google-calendar-mcp`
- `geoapify-mcp-server`

---

## Testing Plan

For each server:

1. **Install** - `pip install` or `npm install -g`
2. **Standalone test** - Run command directly, verify tools list
3. **Config test** - Add to `mcp_config.json`, test connection
4. **Integration test** - Test via orchestrator with real queries

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Package version incompatibility | Pin versions in requirements.txt |
| OAuth token expiry | Built-in refresh in most packages |
| MCP server not maintained | Have backup alternatives identified |
| Spotify Premium requirement | Document clearly, browser fallback |
| npx slow first run | Pre-install with `npm install -g` |

---

## Success Criteria

- [ ] OpenWeather MCP installed and working
- [ ] Geoapify MCP installed and working
- [ ] Telegram MCP installed and authenticated
- [ ] Spotify MCP installed and authenticated
- [ ] Google Calendar MCP installed and authenticated
- [ ] WebFetch solution decided (existing or custom)
- [ ] Cron server built (if needed)
- [ ] All servers added to `mcp_config.json`
- [ ] `.env.example` updated
- [ ] `MCP_SETUP_GUIDE.md` updated
- [ ] `CURRENT_STATE.md` updated
