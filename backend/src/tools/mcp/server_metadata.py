"""Metadata for MCP server configuration requirements."""

import os

SERVER_METADATA = {
    "brave-search": {
        "display_name": "Brave Search",
        "category": "search",
        "env_vars": [
            {
                "name": "BRAVE_API_KEY",
                "label": "API Key",
                "type": "password",
                "required": True,
                "help_url": "https://brave.com/search/api/",
                "help_text": "Get free key (2000 queries/month)"
            }
        ]
    },
    "filesystem": {
        "display_name": "Filesystem",
        "category": "system",
        "env_vars": []
    },
    "weather": {
        "display_name": "Weather",
        "category": "info",
        "env_vars": []
    },
    "telegram": {
        "display_name": "Telegram",
        "category": "communication",
        "env_vars": [
            {
                "name": "TELEGRAM_API_ID",
                "label": "API ID",
                "type": "text",
                "required": True,
                "help_url": "https://my.telegram.org/apps",
                "help_text": "Get from my.telegram.org/apps"
            },
            {
                "name": "TELEGRAM_API_HASH",
                "label": "API Hash",
                "type": "password",
                "required": True,
                "help_url": "https://my.telegram.org/apps",
                "help_text": "Get from my.telegram.org/apps"
            },
            {
                "name": "TELEGRAM_SESSION_STRING",
                "label": "Session String",
                "type": "password",
                "required": True,
                "help_text": "Run: cd telegram-mcp && uv run session_string_generator.py"
            }
        ]
    },
    "google-workspace": {
        "display_name": "Google Workspace",
        "category": "productivity",
        "auth_type": "oauth",
        "env_vars": [
            {
                "name": "GOOGLE_CLIENT_ID",
                "label": "Client ID",
                "type": "text",
                "required": True,
                "help_url": "https://console.cloud.google.com/apis/credentials",
                "help_text": "Create OAuth 2.0 Client ID"
            },
            {
                "name": "GOOGLE_CLIENT_SECRET",
                "label": "Client Secret",
                "type": "password",
                "required": True,
                "help_url": "https://console.cloud.google.com/apis/credentials",
                "help_text": "From OAuth 2.0 credentials"
            }
        ],
        "setup_note": "Requires enabling Gmail, Calendar, and Drive APIs in Google Cloud Console"
    },
    "todoist": {
        "display_name": "Todoist",
        "category": "productivity",
        "env_vars": [
            {
                "name": "TODOIST_API_TOKEN",
                "label": "API Token",
                "type": "password",
                "required": True,
                "help_url": "https://todoist.com/app/settings/integrations/developer",
                "help_text": "Get from Todoist Settings > Integrations > Developer"
            }
        ]
    },
    "notion": {
        "display_name": "Notion",
        "category": "productivity",
        "env_vars": [
            {
                "name": "NOTION_API_KEY",
                "label": "Integration Token",
                "type": "password",
                "required": True,
                "help_url": "https://www.notion.so/my-integrations",
                "help_text": "Create integration, then share pages with it"
            }
        ],
        "setup_note": "After setup, share specific Notion pages with your integration"
    },
    "slack": {
        "display_name": "Slack",
        "category": "communication",
        "env_vars": [
            {
                "name": "SLACK_BOT_TOKEN",
                "label": "Bot Token",
                "type": "password",
                "required": True,
                "help_url": "https://api.slack.com/apps",
                "help_text": "Create app > OAuth & Permissions > Bot Token (xoxb-...)"
            },
            {
                "name": "SLACK_TEAM_ID",
                "label": "Team ID",
                "type": "text",
                "required": True,
                "help_text": "Found in workspace settings or URL (T...)"
            }
        ],
        "setup_note": "Add scopes: channels:history, channels:read, chat:write, users:read"
    },
    "memory": {
        "display_name": "Memory",
        "category": "system",
        "env_vars": []
    }
}


def get_server_metadata(server_name: str) -> dict:
    """Get metadata for a server, with defaults for unknown servers."""
    return SERVER_METADATA.get(server_name, {
        "display_name": server_name,
        "category": "other",
        "env_vars": []
    })


def get_missing_env_vars(server_name: str) -> list:
    """Check which required env vars are missing for a server."""
    metadata = get_server_metadata(server_name)
    missing = []
    for var in metadata.get("env_vars", []):
        if var.get("required") and not os.getenv(var["name"]):
            missing.append(var["name"])
    return missing
