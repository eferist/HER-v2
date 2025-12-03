# MCP Setup Guide

This guide walks you through setting up each MCP server integration.

## Overview

| Server | Difficulty | Time | What You Get |
|--------|------------|------|--------------|
| Weather | ✅ None | 0 min | Weather forecasts (US) |
| Filesystem | ✅ None | 0 min | Read/write local files |
| Brave Search | 🟡 Easy | 2 min | Web search, news |
| OpenWeather | 🟡 Easy | 2 min | International weather |
| Geoapify | 🟡 Easy | 2 min | Places/POI, geocoding |
| Notion | 🟡 Easy | 5 min | Notes, databases |
| GitHub | 🟡 Easy | 5 min | Repos, issues, PRs |
| Telegram | 🟠 Medium | 5 min | Send/read messages |
| Google Workspace | 🟠 Medium | 15 min | Gmail, Calendar, Drive |
| Spotify | 🟠 Medium | 10 min | Music control (Premium) |

---

## Already Working (No Setup)

### Weather
Just works! Query examples:
```
> What's the weather in New York?
> Will it rain in Seattle tomorrow?
```

### Filesystem
Just works! Query examples:
```
> List all files in this project
> Read the contents of README.md
```

---

## Easy Setup (API Key Only)

### Brave Search

**Time: 2 minutes**

1. Go to https://brave.com/search/api/
2. Click "Get Started for Free"
3. Create account and verify email
4. Copy your API key
5. Add to `.env`:
   ```
   BRAVE_API_KEY=your_key_here
   ```
6. Restart the orchestrator

**Free tier**: 2,000 queries/month

**Query examples:**
```
> Search for best restaurants near me
> What's the latest news about AI?
> Find Python tutorials
```

---

### OpenWeather

**Time: 2 minutes**

Better for international locations than the default weather server.

1. Go to https://openweathermap.org/api
2. Click "Sign Up" and create account
3. Go to "My API Keys" in your account
4. Copy your API key (or generate a new one)
5. Add to `.env`:
   ```
   OPENWEATHER_API_KEY=your_key_here
   ```
6. Enable in `mcp_config.json`:
   ```json
   "openweather": {
     ...
     "enabled": true
   }
   ```
7. Restart the orchestrator

**Free tier**: 1,000 calls/day

**Query examples:**
```
> What's the weather in Tokyo?
> 5-day forecast for Bali
> Current temperature in Jakarta
```

---

### Geoapify

**Time: 2 minutes**

Find places, POIs, get directions, and geocode addresses.

1. Go to https://myprojects.geoapify.com/
2. Sign up / Log in
3. Create a new project
4. Copy your API key
5. Add to `.env`:
   ```
   GEOAPIFY_API_KEY=your_key_here
   ```
6. Enable in `mcp_config.json`:
   ```json
   "geoapify": {
     ...
     "enabled": true
   }
   ```
7. Restart the orchestrator

**Free tier**: 3,000 credits/day

**Query examples:**
```
> Find restaurants near Malioboro Yogyakarta
> Where's the nearest ATM?
> Get directions from Jakarta to Bandung
> What's the address for these coordinates?
```

---

### Notion

**Time: 5 minutes**

#### Step 1: Create Integration

1. Go to https://www.notion.so/profile/integrations
2. Click "+ New integration"
3. Fill in:
   - Name: `JIT Orchestrator` (or anything)
   - Associated workspace: Select your workspace
4. Click "Submit"
5. Copy the "Internal Integration Secret" (starts with `ntn_` or `secret_`)

#### Step 2: Share Pages with Integration

**Important!** Your integration can only access pages you explicitly share.

1. Open a Notion page you want to access
2. Click "..." menu (top right)
3. Click "Connections" → "Connect to"
4. Find and select your integration
5. Repeat for each page/database you want to access

#### Step 3: Configure

1. Add to `.env`:
   ```
   NOTION_TOKEN=ntn_xxxxxxxxxxxxx
   ```
2. Enable in `mcp_config.json`:
   ```json
   "notion": {
     ...
     "enabled": true
   }
   ```
3. Restart the orchestrator

**Query examples:**
```
> Find my notes about project X
> What's in my Tasks database?
> Create a new page called Meeting Notes
```

---

### GitHub

**Time: 5 minutes**

#### Step 1: Create Personal Access Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Fill in:
   - Note: `JIT Orchestrator`
   - Expiration: Choose based on preference
   - Scopes: Select these:
     - ✅ `repo` (Full repository access)
     - ✅ `read:user` (Read user profile)
4. Click "Generate token"
5. **Copy the token immediately** (won't be shown again!)

#### Step 2: Configure

1. Add to `.env`:
   ```
   GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
   ```
2. Enable in `mcp_config.json`:
   ```json
   "github": {
     ...
     "enabled": true
   }
   ```
3. Restart the orchestrator

**Query examples:**
```
> Show my open pull requests
> What repos did I update recently?
> Create an issue in my project
```

---

## Medium Setup (OAuth Required)

### Telegram

**Time: 5 minutes**

Send messages, read chats, search contacts using your Telegram account.

#### Step 1: Get API Credentials

1. Go to https://my.telegram.org/apps
2. Log in with your phone number
3. Click "API development tools"
4. Create a new application:
   - App title: `JIT Orchestrator`
   - Short name: `jit_orchestrator`
   - Platform: Other
5. Copy **API ID** and **API Hash**

#### Step 2: Configure

1. Add to `.env`:
   ```
   TELEGRAM_API_ID=12345678
   TELEGRAM_API_HASH=your_api_hash_here
   ```
2. Enable in `mcp_config.json`:
   ```json
   "telegram": {
     ...
     "enabled": true
   }
   ```

#### Step 3: First-time Auth

The first time you start the orchestrator with Telegram enabled, it will:
1. Ask for your phone number
2. Send you a code via Telegram
3. Ask you to enter the code

This creates a session file so you won't need to auth again.

**Note**: This uses your personal Telegram account, not a bot.

**Query examples:**
```
> Send a message to John saying I'll be late
> What did Sarah send me today?
> Show my unread messages
> Search for messages about the project
```

---

### Google Workspace

**Time: 15 minutes**

Gives you access to: Gmail, Calendar, Drive, Docs, Sheets

#### Step 1: Create Google Cloud Project

1. Go to https://console.cloud.google.com
2. Click "Select a project" → "New Project"
3. Name: `JIT Orchestrator`
4. Click "Create"

#### Step 2: Enable APIs

1. Go to "APIs & Services" → "Library"
2. Search and enable each:
   - Gmail API
   - Google Calendar API
   - Google Drive API
   - Google Docs API
   - Google Sheets API

#### Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" → Create
3. Fill in:
   - App name: `JIT Orchestrator`
   - User support email: Your email
   - Developer contact: Your email
4. Click "Save and Continue"
5. Scopes: Click "Add or Remove Scopes"
   - Add Gmail, Calendar, Drive scopes
6. Test users: Add your email
7. Click "Save and Continue"

#### Step 4: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: "Desktop app"
4. Name: `JIT Orchestrator`
5. Click "Create"
6. **Copy Client ID and Client Secret**

#### Step 5: Configure

1. Add to `.env`:
   ```
   GOOGLE_OAUTH_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxxxx
   ```
2. Enable in `mcp_config.json`:
   ```json
   "google-workspace": {
     ...
     "enabled": true
   }
   ```

#### Step 6: First-time Auth

Run this once to authorize:
```bash
uvx workspace-mcp --auth
```
A browser will open. Log in with your Google account and approve access.

#### Step 7: Restart

Restart the orchestrator. Done!

**Query examples:**
```
> What's on my calendar today?
> Send an email to john@example.com about the meeting
> Find documents about Q4 budget
> Create a calendar event for tomorrow at 3pm
```

---

### Spotify

**Time: 10 minutes**

#### Step 1: Create Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in:
   - App name: `JIT Orchestrator`
   - App description: `AI assistant integration`
   - Redirect URI: `http://127.0.0.1:8080/callback`
5. Check "Web API"
6. Click "Save"

#### Step 2: Get Credentials

1. Click on your app
2. Click "Settings"
3. Copy **Client ID** and **Client Secret**

#### Step 3: Configure

1. Add to `.env`:
   ```
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   ```
2. Enable in `mcp_config.json`:
   ```json
   "spotify": {
     ...
     "enabled": true
   }
   ```

#### Step 4: First-time Auth

The first time you use Spotify commands, a browser will open for authorization.

**Note**: Requires Spotify Premium for playback control.

**Query examples:**
```
> What song is playing?
> Play my Discover Weekly playlist
> Add this song to my favorites
> Play something relaxing
```

---

## Enabling/Disabling Servers

Edit `mcp_config.json`:

```json
"notion": {
  ...
  "enabled": true   // Change to true/false
}
```

Then restart the orchestrator.

---

## Troubleshooting

### Server shows 0 tools
- Check if API key is set in `.env`
- Check if `enabled: true` in config
- Run `mcp:status` to see connected servers

### "Connection closed" error
- API key might be invalid
- Service might be down
- Check error message for details

### OAuth flow not working
- Make sure redirect URI matches exactly
- Try clearing browser cookies
- Check if app is still in "Testing" mode (Google)

---

## Quick Reference

After setup, add to `.env`:

```bash
# Easy (API key)
BRAVE_API_KEY=xxx
OPENWEATHER_API_KEY=xxx
GEOAPIFY_API_KEY=xxx
NOTION_TOKEN=ntn_xxx
GITHUB_TOKEN=ghp_xxx

# Medium (OAuth/Auth)
TELEGRAM_API_ID=xxx
TELEGRAM_API_HASH=xxx
GOOGLE_OAUTH_CLIENT_ID=xxx
GOOGLE_OAUTH_CLIENT_SECRET=xxx
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
```

Enable in `mcp_config.json`:
```json
"server_name": {
  "enabled": true
}
```

Restart and test:
```bash
source venv/bin/activate
python -m src.orchestrator.main
> mcp:status
```

---

## Server Comparison

### Weather Options
| Server | Coverage | Features |
|--------|----------|----------|
| weather (default) | US only | Basic forecasts |
| openweather | International | Current + 5-day forecast |

**Recommendation**: Enable `openweather` if you need international weather.

### Search + Places
| Server | Use For |
|--------|---------|
| brave-search | Web search, news, general info |
| geoapify | Find restaurants, ATMs, routing |

**Recommendation**: Enable both - they complement each other.
