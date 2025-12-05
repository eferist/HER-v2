# PLAN: Add Productivity MCP Tools

> **Goal:** Integrate productivity-focused MCP servers to enable the super-agent to manage emails, calendars, tasks, notes, and team communication.
> **Priority:** HIGH
> **Estimated Effort:** Medium

---

## Overview

This plan adds 5 productivity MCP servers that will transform the orchestrator into a personal productivity assistant capable of:

- Reading and sending emails (Gmail)
- Managing calendar events (Google Calendar)
- Creating and organizing tasks (Todoist)
- Managing knowledge bases (Notion)
- Team communication (Slack)

---

## Servers to Add

| Server | Purpose | Auth Type | Complexity |
|--------|---------|-----------|------------|
| **Google Workspace** | Gmail + Calendar + Drive | OAuth 2.0 | Medium |
| **Todoist** | Task management | API Key | Low |
| **Notion** | Knowledge base & docs | API Key | Low |
| **Slack** | Team messaging | Bot Token | Medium |
| **Memory** | Persistent AI memory | None | Low |

---

## Implementation Steps

### Step 1: Update mcp_config.json

Add the following server configurations:

```json
{
  "google-workspace": {
    "command": "npx",
    "args": ["-y", "google-workspace-mcp"],
    "env": {
      "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
      "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}",
      "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth/callback"
    },
    "enabled": true,
    "description": "Gmail, Calendar, Drive, Docs, Sheets, Tasks"
  },
  "todoist": {
    "command": "npx",
    "args": ["-y", "todoist-mcp-server"],
    "env": {
      "TODOIST_API_TOKEN": "${TODOIST_API_TOKEN}"
    },
    "enabled": true,
    "description": "Task management with projects and labels"
  },
  "notion": {
    "command": "npx",
    "args": ["-y", "@notionhq/notion-mcp-server"],
    "env": {
      "NOTION_API_KEY": "${NOTION_API_KEY}"
    },
    "enabled": true,
    "description": "Notion pages, databases, workspaces"
  },
  "slack": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-slack"],
    "env": {
      "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}",
      "SLACK_TEAM_ID": "${SLACK_TEAM_ID}"
    },
    "enabled": true,
    "description": "Slack channels, messages, threads"
  },
  "memory": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-memory"],
    "enabled": true,
    "description": "Knowledge graph persistent memory"
  }
}
```

### Step 2: Update .env.example

Add new environment variables:

```bash
# ============================================
# PRODUCTIVITY MCP SERVERS
# ============================================

# Google Workspace (Gmail, Calendar, Drive)
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Todoist
# Get from: https://todoist.com/app/settings/integrations/developer
TODOIST_API_TOKEN=

# Notion
# Get from: https://www.notion.so/my-integrations
NOTION_API_KEY=

# Slack
# Get from: https://api.slack.com/apps (create a bot)
SLACK_BOT_TOKEN=xoxb-...
SLACK_TEAM_ID=T...
```

### Step 3: API Setup Instructions

#### 3.1 Google Workspace Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs:
   - Gmail API
   - Google Calendar API
   - Google Drive API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:3000/oauth/callback`
5. Download credentials and extract `client_id` and `client_secret`

**Required Scopes:**
```
https://www.googleapis.com/auth/gmail.modify
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/drive
```

#### 3.2 Todoist Setup

1. Go to [Todoist Developer](https://todoist.com/app/settings/integrations/developer)
2. Create a new app or use personal API token
3. Copy the API token

#### 3.3 Notion Setup

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create new integration
3. Select capabilities:
   - Read content
   - Update content
   - Insert content
4. Copy the Internal Integration Token
5. Share specific pages/databases with the integration

#### 3.4 Slack Setup

1. Go to [Slack API](https://api.slack.com/apps)
2. Create new app → From scratch
3. Add Bot Token Scopes:
   ```
   channels:history
   channels:read
   chat:write
   groups:history
   groups:read
   im:history
   im:read
   im:write
   users:read
   ```
4. Install to workspace
5. Copy Bot User OAuth Token (`xoxb-...`)
6. Get Team ID from workspace settings

---

## Step 4: Test Each Server

Create test queries for each server:

```
# Google Workspace
> Check my unread emails
> What meetings do I have tomorrow?
> Create a calendar event for Friday at 2pm

# Todoist
> Show my tasks for today
> Add a task: Review PR #123
> What's in my inbox project?

# Notion
> Search my Notion for "meeting notes"
> Create a new page in my workspace
> List all databases

# Slack
> Check unread messages in #general
> Send a message to #dev: "Build complete"
> Who's online right now?

# Memory
> Remember that the project deadline is Dec 15
> What do you remember about the deadline?
```

---

## Step 5: Update CURRENT_STATE.md

After implementation, update the MCP Servers table:

```markdown
## MCP Servers

| Server | Status | Setup | What You Get |
|--------|--------|-------|--------------|
| brave-search | Enabled | API key | Web search, news, local places |
| filesystem | Enabled | None | Read/write local files |
| weather | Enabled | None | Weather, air quality, timezone data |
| telegram | Enabled | API ID, Hash, Session | Messages, contacts, groups |
| google-workspace | Enabled | OAuth 2.0 | Gmail, Calendar, Drive, Docs |
| todoist | Enabled | API key | Tasks, projects, labels |
| notion | Enabled | API key | Pages, databases, workspaces |
| slack | Enabled | Bot token | Channels, messages, threads |
| memory | Enabled | None | Persistent knowledge graph |
```

---

## Example Queries After Implementation

```
# Cross-tool workflows
> Check my email for meeting invites and add them to my calendar
> Create a Notion page summarizing today's Slack discussions
> Add all overdue Todoist tasks to my calendar as time blocks
> Send a Slack message with my calendar availability for tomorrow

# Personal assistant
> What's my day look like?
> Summarize unread emails and Slack messages
> What tasks am I behind on?

# Knowledge management
> Remember this: API endpoint is /v2/users
> Save this meeting summary to Notion
> What did we discuss about the database migration?
```

---

## Rollback Plan

If issues arise:
1. Set `"enabled": false` for problematic server in `mcp_config.json`
2. Run `mcp:reload` in terminal
3. Server will be disconnected without affecting others

---

## Security Notes

1. **Google OAuth**: Tokens are stored locally, first auth requires browser
2. **Notion**: Only pages explicitly shared with integration are accessible
3. **Slack**: Bot can only access channels it's invited to
4. **Todoist**: Full access to account - use dedicated project for testing
5. **Memory**: Data stored locally in knowledge graph format

---

## Dependencies

```bash
# These are installed via npx on first run, no manual install needed
# Verify Node.js is available:
node --version  # Should be 18+
npx --version
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/mcp_config.json` | Add 5 new server configs |
| `backend/.env` | Add API keys and tokens |
| `backend/.env.example` | Document new variables |
| `docs/1_Constitution/CURRENT_STATE.md` | Update MCP servers table |

---

## Success Criteria

- [ ] All 5 servers connect successfully on startup
- [ ] `mcp:status` shows all servers as connected
- [ ] Gmail read/send works
- [ ] Calendar events can be created/listed
- [ ] Todoist tasks can be created/listed
- [ ] Notion pages can be searched/created
- [ ] Slack messages can be read/sent
- [ ] Memory persists across sessions
- [ ] No errors in logs during normal operation

---

## Timeline Estimate

| Phase | Tasks |
|-------|-------|
| Setup | Create API credentials for all services |
| Config | Update mcp_config.json and .env |
| Test | Verify each server individually |
| Integration | Test cross-tool queries |
| Docs | Update CURRENT_STATE.md |

---

*Plan created: December 2025*
*Reference: RESEARCH_MCP_Super_Agent_Ecosystem.md*
