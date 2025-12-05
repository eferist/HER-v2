# PLAN: Tools Page Configuration UI

> **Goal:** Allow users to configure MCP servers directly from the web UI Tools page
> **Priority:** HIGH
> **Complexity:** Medium

---

## Overview

Transform the Tools page from a read-only display into an interactive configuration hub where users can:
- See which servers need setup and what credentials are required
- Click to configure API keys/tokens directly in the UI
- Enable/disable servers with a toggle
- Get guided setup instructions with links

---

## Current State

```
┌─────────────────────────────────────┐
│  todoist                  [Disabled] │
│  Task management                     │
│  [3 tools]                           │
└─────────────────────────────────────┘
        (No way to configure!)
```

## Target State

```
┌─────────────────────────────────────┐
│  todoist                  [Disabled] │
│  Task management                     │
│                                      │
│  ⚠️ Missing: TODOIST_API_TOKEN       │
│                                      │
│  [🔧 Configure]                      │
└─────────────────────────────────────┘
        ↓ Click Configure
┌─────────────────────────────────────┐
│        Configure Todoist         [X] │
├─────────────────────────────────────┤
│                                      │
│  API Token *                         │
│  ┌─────────────────────────────────┐ │
│  │ ••••••••••••••••                │ │
│  └─────────────────────────────────┘ │
│  📎 Get your token:                  │
│  todoist.com/app/settings/integra... │
│                                      │
│  ┌──────────┐  ┌──────────────────┐  │
│  │  Cancel  │  │  Save & Enable   │  │
│  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Add Server Metadata (Backend)

Create a metadata file that defines what each server needs:

**File:** `backend/src/tools/mcp/server_metadata.py`

```python
"""Metadata for MCP server configuration requirements."""

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
        "env_vars": []  # No config needed
    },
    "weather": {
        "display_name": "Weather",
        "category": "info",
        "env_vars": []  # No config needed
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
        "auth_type": "oauth",  # Special flag for OAuth servers
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
                "help_text": "Get from Todoist Settings → Integrations → Developer"
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
                "help_text": "Create app → OAuth & Permissions → Bot Token (xoxb-...)"
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
        "env_vars": []  # No config needed
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
    import os
    metadata = get_server_metadata(server_name)
    missing = []
    for var in metadata.get("env_vars", []):
        if var.get("required") and not os.getenv(var["name"]):
            missing.append(var["name"])
    return missing
```

---

### Step 2: Add Backend API Endpoints

**File:** `backend/src/api/web.py` (add new endpoints)

```python
from src.tools.mcp.server_metadata import (
    get_server_metadata,
    get_missing_env_vars,
    SERVER_METADATA
)

@app.get("/api/mcp/servers/{server_name}/metadata")
async def get_server_config_metadata(server_name: str):
    """Get configuration metadata for a server."""
    metadata = get_server_metadata(server_name)
    missing = get_missing_env_vars(server_name)

    return {
        "server": server_name,
        "metadata": metadata,
        "missing_vars": missing,
        "is_configured": len(missing) == 0
    }

@app.post("/api/mcp/servers/{server_name}/configure")
async def configure_server(server_name: str, config: dict):
    """
    Configure a server's environment variables and optionally enable it.

    Body: {
        "env_vars": {"VAR_NAME": "value", ...},
        "enable": true
    }
    """
    from pathlib import Path
    import json

    env_vars = config.get("env_vars", {})
    enable = config.get("enable", False)

    # 1. Update .env file
    env_path = Path(__file__).parent.parent.parent / ".env"
    env_lines = []
    existing_vars = set()

    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                # Check if this line sets a var we're updating
                for var_name in env_vars:
                    if line.startswith(f"{var_name}="):
                        env_lines.append(f"{var_name}={env_vars[var_name]}\n")
                        existing_vars.add(var_name)
                        break
                else:
                    env_lines.append(line)

    # Add new vars that weren't in the file
    for var_name, value in env_vars.items():
        if var_name not in existing_vars:
            env_lines.append(f"{var_name}={value}\n")

    # Write back
    with open(env_path, "w") as f:
        f.writelines(env_lines)

    # 2. Update mcp_config.json if enabling
    if enable:
        config_path = Path(__file__).parent.parent.parent / "mcp_config.json"
        with open(config_path, "r") as f:
            mcp_config = json.load(f)

        if server_name in mcp_config.get("servers", {}):
            mcp_config["servers"][server_name]["enabled"] = True

            with open(config_path, "w") as f:
                json.dump(mcp_config, f, indent=2)

    # 3. Reload environment
    from dotenv import load_dotenv
    load_dotenv(env_path, override=True)

    return {
        "success": True,
        "server": server_name,
        "enabled": enable,
        "message": f"Configuration saved. {'Server enabled.' if enable else 'Run mcp:reload to apply.'}"
    }

@app.post("/api/mcp/servers/{server_name}/toggle")
async def toggle_server(server_name: str, body: dict):
    """Enable or disable a server."""
    from pathlib import Path
    import json

    enabled = body.get("enabled", False)

    config_path = Path(__file__).parent.parent.parent / "mcp_config.json"
    with open(config_path, "r") as f:
        mcp_config = json.load(f)

    if server_name in mcp_config.get("servers", {}):
        mcp_config["servers"][server_name]["enabled"] = enabled

        with open(config_path, "w") as f:
            json.dump(mcp_config, f, indent=2)

        return {"success": True, "server": server_name, "enabled": enabled}

    return {"success": False, "error": "Server not found"}
```

---

### Step 3: Update `/api/mcp/servers` Response

Enhance the existing endpoint to include metadata:

```python
@app.get("/api/mcp/servers")
async def get_mcp_servers():
    """Get list of MCP servers with their tools and config metadata."""
    configs, _ = load_mcp_config()

    servers = []
    for config in configs:
        metadata = get_server_metadata(config.name)
        missing = get_missing_env_vars(config.name)

        server_info = {
            "name": config.name,
            "enabled": config.enabled,
            "description": config.description,
            "connected": False,
            "tools": [],
            "tool_count": 0,
            # New fields
            "display_name": metadata.get("display_name", config.name),
            "category": metadata.get("category", "other"),
            "env_vars": metadata.get("env_vars", []),
            "missing_vars": missing,
            "is_configured": len(missing) == 0,
            "auth_type": metadata.get("auth_type"),
            "setup_note": metadata.get("setup_note")
        }

        if mcp_manager and config.name in mcp_manager.servers:
            mcp = mcp_manager.servers[config.name]
            server_info["connected"] = True
            if hasattr(mcp, 'functions') and mcp.functions:
                server_info["tools"] = list(mcp.functions.keys())
                server_info["tool_count"] = len(mcp.functions)

        servers.append(server_info)

    return {"servers": servers}
```

---

### Step 4: Create Configuration Modal Component (Frontend)

**File:** `frontend/js/components/ConfigModal.js`

```javascript
/**
 * Configuration Modal Component
 * Modal dialog for configuring MCP server credentials
 */

export class ConfigModal {
    constructor() {
        this.modal = null;
        this.server = null;
        this.onSave = null;
    }

    /**
     * Show the configuration modal for a server
     */
    show(server, onSave) {
        this.server = server;
        this.onSave = onSave;
        this._render();
        this._attachEvents();
    }

    /**
     * Hide and destroy the modal
     */
    hide() {
        if (this.modal) {
            this.modal.classList.add('closing');
            setTimeout(() => {
                this.modal.remove();
                this.modal = null;
            }, 200);
        }
    }

    _render() {
        // Remove existing modal if any
        const existing = document.querySelector('.config-modal-overlay');
        if (existing) existing.remove();

        const hasOAuth = this.server.auth_type === 'oauth';
        const envVars = this.server.env_vars || [];

        this.modal = document.createElement('div');
        this.modal.className = 'config-modal-overlay';
        this.modal.innerHTML = `
            <div class="config-modal">
                <div class="config-modal-header">
                    <h2>Configure ${this._escapeHtml(this.server.display_name || this.server.name)}</h2>
                    <button class="config-modal-close" aria-label="Close">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <div class="config-modal-body">
                    ${this.server.setup_note ? `
                        <div class="config-note">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                            </svg>
                            <span>${this._escapeHtml(this.server.setup_note)}</span>
                        </div>
                    ` : ''}

                    ${hasOAuth ? `
                        <div class="config-oauth-notice">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                            </svg>
                            <div>
                                <strong>OAuth Authentication</strong>
                                <p>This service uses OAuth. Enter your credentials below, then you'll need to authorize in a browser on first use.</p>
                            </div>
                        </div>
                    ` : ''}

                    <form class="config-form" id="configForm">
                        ${envVars.map(v => this._renderField(v)).join('')}

                        ${envVars.length === 0 ? `
                            <div class="config-no-vars">
                                <p>This server doesn't require any configuration.</p>
                            </div>
                        ` : ''}
                    </form>
                </div>

                <div class="config-modal-footer">
                    <button type="button" class="btn btn-secondary" id="configCancel">Cancel</button>
                    ${envVars.length > 0 ? `
                        <button type="submit" form="configForm" class="btn btn-primary" id="configSave">
                            <span class="btn-text">Save & Enable</span>
                            <span class="btn-loading" style="display:none;">
                                <svg class="spinner" viewBox="0 0 24 24" width="16" height="16">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="60" stroke-linecap="round"/>
                                </svg>
                                Saving...
                            </span>
                        </button>
                    ` : `
                        <button type="button" class="btn btn-primary" id="configEnable">Enable Server</button>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Trigger animation
        requestAnimationFrame(() => {
            this.modal.classList.add('visible');
        });

        // Focus first input
        const firstInput = this.modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }

    _renderField(varConfig) {
        const isMissing = (this.server.missing_vars || []).includes(varConfig.name);
        const inputType = varConfig.type === 'password' ? 'password' : 'text';

        return `
            <div class="config-field ${isMissing ? 'missing' : ''}">
                <label for="field_${varConfig.name}">
                    ${this._escapeHtml(varConfig.label)}
                    ${varConfig.required ? '<span class="required">*</span>' : ''}
                    ${isMissing ? '<span class="missing-badge">Missing</span>' : ''}
                </label>
                <div class="config-input-wrapper">
                    <input
                        type="${inputType}"
                        id="field_${varConfig.name}"
                        name="${varConfig.name}"
                        placeholder="${varConfig.type === 'password' ? '••••••••••••' : ''}"
                        ${varConfig.required ? 'required' : ''}
                        autocomplete="off"
                    />
                    ${inputType === 'password' ? `
                        <button type="button" class="toggle-visibility" data-field="field_${varConfig.name}">
                            <svg class="icon-show" viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                            <svg class="icon-hide" viewBox="0 0 24 24" width="18" height="18" style="display:none;">
                                <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                ${varConfig.help_text ? `
                    <div class="config-help">
                        ${varConfig.help_url ? `
                            <a href="${varConfig.help_url}" target="_blank" rel="noopener">
                                ${this._escapeHtml(varConfig.help_text)}
                                <svg viewBox="0 0 24 24" width="12" height="12">
                                    <path fill="currentColor" d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                                </svg>
                            </a>
                        ` : this._escapeHtml(varConfig.help_text)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    _attachEvents() {
        // Close button
        this.modal.querySelector('.config-modal-close').addEventListener('click', () => this.hide());

        // Cancel button
        this.modal.querySelector('#configCancel').addEventListener('click', () => this.hide());

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        // Escape key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.hide();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Toggle password visibility
        this.modal.querySelectorAll('.toggle-visibility').forEach(btn => {
            btn.addEventListener('click', () => {
                const fieldId = btn.dataset.field;
                const input = document.getElementById(fieldId);
                const showIcon = btn.querySelector('.icon-show');
                const hideIcon = btn.querySelector('.icon-hide');

                if (input.type === 'password') {
                    input.type = 'text';
                    showIcon.style.display = 'none';
                    hideIcon.style.display = 'block';
                } else {
                    input.type = 'password';
                    showIcon.style.display = 'block';
                    hideIcon.style.display = 'none';
                }
            });
        });

        // Form submit
        const form = this.modal.querySelector('#configForm');
        if (form) {
            form.addEventListener('submit', (e) => this._handleSubmit(e));
        }

        // Enable button (for servers with no config)
        const enableBtn = this.modal.querySelector('#configEnable');
        if (enableBtn) {
            enableBtn.addEventListener('click', () => this._handleEnable());
        }
    }

    async _handleSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const envVars = {};

        for (const [key, value] of formData.entries()) {
            if (value.trim()) {
                envVars[key] = value.trim();
            }
        }

        // Show loading state
        const saveBtn = this.modal.querySelector('#configSave');
        const btnText = saveBtn.querySelector('.btn-text');
        const btnLoading = saveBtn.querySelector('.btn-loading');
        saveBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';

        try {
            const response = await fetch(`/api/mcp/servers/${this.server.name}/configure`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ env_vars: envVars, enable: true })
            });

            const result = await response.json();

            if (result.success) {
                this.hide();
                if (this.onSave) this.onSave(result);
            } else {
                alert('Failed to save configuration: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to save config:', error);
            alert('Failed to save configuration. Please try again.');
        } finally {
            saveBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    async _handleEnable() {
        try {
            const response = await fetch(`/api/mcp/servers/${this.server.name}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: true })
            });

            const result = await response.json();

            if (result.success) {
                this.hide();
                if (this.onSave) this.onSave(result);
            }
        } catch (error) {
            console.error('Failed to enable server:', error);
            alert('Failed to enable server. Please try again.');
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

// Singleton instance
export const configModal = new ConfigModal();
```

---

### Step 5: Add Modal CSS

**File:** `frontend/css/components/modal.css`

```css
/* ===================================================================
   Configuration Modal Styles
   =================================================================== */

.config-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.2s ease;
}

.config-modal-overlay.visible {
    opacity: 1;
}

.config-modal-overlay.closing {
    opacity: 0;
}

.config-modal {
    background: var(--card-bg);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 20px;
    width: 90%;
    max-width: 480px;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    transform: translateY(20px) scale(0.95);
    transition: transform 0.2s ease;
}

.config-modal-overlay.visible .config-modal {
    transform: translateY(0) scale(1);
}

/* Header */
.config-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.config-modal-header h2 {
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
    margin: 0;
}

.config-modal-close {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 4px;
    border-radius: 8px;
    transition: all 0.2s;
}

.config-modal-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
}

/* Body */
.config-modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

/* Notes */
.config-note {
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    background: rgba(255, 193, 7, 0.1);
    border: 1px solid rgba(255, 193, 7, 0.2);
    border-radius: 10px;
    margin-bottom: 20px;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.8);
}

.config-note svg {
    flex-shrink: 0;
    color: #ffc107;
    margin-top: 1px;
}

.config-oauth-notice {
    display: flex;
    gap: 12px;
    padding: 14px 16px;
    background: rgba(33, 150, 243, 0.1);
    border: 1px solid rgba(33, 150, 243, 0.2);
    border-radius: 10px;
    margin-bottom: 20px;
}

.config-oauth-notice svg {
    flex-shrink: 0;
    color: #2196f3;
}

.config-oauth-notice strong {
    display: block;
    font-size: 0.9rem;
    color: #fff;
    margin-bottom: 4px;
}

.config-oauth-notice p {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.7);
    margin: 0;
    line-height: 1.4;
}

/* Form Fields */
.config-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.config-field label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    margin-bottom: 8px;
}

.config-field .required {
    color: #ff6b6b;
}

.config-field .missing-badge {
    font-size: 0.7rem;
    padding: 2px 6px;
    background: rgba(255, 107, 107, 0.2);
    color: #ff6b6b;
    border-radius: 4px;
    margin-left: auto;
}

.config-input-wrapper {
    position: relative;
    display: flex;
}

.config-field input {
    flex: 1;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    color: #fff;
    font-size: 0.9rem;
    transition: all 0.2s;
}

.config-field input:focus {
    outline: none;
    border-color: var(--accent-color);
    background: rgba(255, 255, 255, 0.08);
}

.config-field input::placeholder {
    color: rgba(255, 255, 255, 0.3);
}

.config-field.missing input {
    border-color: rgba(255, 107, 107, 0.4);
}

/* Password toggle */
.toggle-visibility {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 4px;
}

.toggle-visibility:hover {
    color: rgba(255, 255, 255, 0.7);
}

/* Help text */
.config-help {
    margin-top: 6px;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
}

.config-help a {
    color: var(--accent-color);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.config-help a:hover {
    text-decoration: underline;
}

/* No vars message */
.config-no-vars {
    text-align: center;
    padding: 20px;
    color: rgba(255, 255, 255, 0.6);
}

/* Footer */
.config-modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn {
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
}

.btn-secondary:hover {
    background: rgba(255, 255, 255, 0.15);
}

.btn-primary {
    background: var(--accent-color);
    color: #fff;
}

.btn-primary:hover {
    filter: brightness(1.1);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-loading {
    display: flex;
    align-items: center;
    gap: 8px;
}

.btn-loading .spinner {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
```

---

### Step 6: Update ToolsPage.js

Add the configure button and modal integration:

```javascript
// Add import at top
import { configModal } from '../components/ConfigModal.js';

// Update _renderCard method to add configure button
_renderCard(server) {
    const iconPath = ToolsPage.ICONS[server.name] || ToolsPage.ICONS.default;
    const hasMissing = server.missing_vars && server.missing_vars.length > 0;

    // Status logic
    let statusClass = 'disabled';
    let statusText = 'Disabled';

    if (server.enabled) {
        if (server.connected) {
            statusClass = 'connected';
            statusText = 'Connected';
        } else {
            statusClass = 'error';
            statusText = 'Disconnected';
        }
    } else if (hasMissing) {
        statusClass = 'needs-setup';
        statusText = 'Needs Setup';
    }

    return `
        <div class="tool-card" data-server="${this.escapeHtml(server.name)}">
            <div class="tool-card-header">
                <div class="tool-card-icon">
                    <svg class="icon" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>
                </div>
                <div class="tool-card-status ${statusClass}">
                    <span class="status-dot"></span>
                    <span class="status-label">${statusText}</span>
                </div>
            </div>
            <div class="tool-card-body">
                <div class="tool-card-name">${this.escapeHtml(server.display_name || server.name)}</div>
                <div class="tool-card-desc">${this.escapeHtml(server.description || 'No description')}</div>
                ${hasMissing ? `
                    <div class="tool-card-missing">
                        Missing: ${server.missing_vars.map(v => `<code>${v}</code>`).join(', ')}
                    </div>
                ` : ''}
            </div>
            <div class="tool-card-footer">
                <div class="tool-card-badge">
                    <span class="badge-count">${server.tool_count}</span>
                    <span class="badge-label">tools</span>
                </div>
                <button class="tool-card-configure" title="Configure">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                    </svg>
                </button>
            </div>
        </div>
    `;
}

// Add event listeners after rendering
_renderServers() {
    const grid = this.container.querySelector('#toolsGrid');
    if (!grid) return;

    if (this.servers.length === 0) {
        this._renderEmpty('No MCP servers configured');
        return;
    }

    grid.innerHTML = this.servers.map(server => this._renderCard(server)).join('');

    // Attach click handlers for configure buttons
    grid.querySelectorAll('.tool-card-configure').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.tool-card');
            const serverName = card.dataset.server;
            const server = this.servers.find(s => s.name === serverName);
            if (server) {
                this._openConfigModal(server);
            }
        });
    });
}

_openConfigModal(server) {
    configModal.show(server, async (result) => {
        // Reload servers after configuration
        await this._loadServers();

        // Optionally trigger MCP reload
        if (result.enabled) {
            try {
                await api.reloadMcp();
            } catch (error) {
                console.error('Failed to reload MCP:', error);
            }
        }
    });
}
```

---

### Step 7: Update CSS Imports

**File:** `frontend/css/main.css` - add import:

```css
@import 'components/modal.css';
```

---

### Step 8: Add Card Configure Button Styles

**File:** `frontend/css/pages/tools.css` - add:

```css
/* Configure Button */
.tool-card-configure {
    margin-left: auto;
    padding: 8px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s;
}

.tool-card-configure:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
}

/* Missing vars notice */
.tool-card-missing {
    margin-top: 10px;
    padding: 8px 10px;
    background: rgba(255, 107, 107, 0.1);
    border-radius: 6px;
    font-size: 0.75rem;
    color: rgba(255, 107, 107, 0.9);
}

.tool-card-missing code {
    background: rgba(255, 255, 255, 0.1);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: monospace;
}

/* Needs setup status */
.tool-card-status.needs-setup .status-dot {
    background: #ffc107;
    box-shadow: 0 0 8px rgba(255, 193, 7, 0.5);
}

.tool-card-status.needs-setup .status-label {
    color: #ffc107;
}

/* Card footer update */
.tool-card-footer {
    display: flex;
    align-items: center;
    gap: 12px;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/src/tools/mcp/server_metadata.py` | CREATE | Server config metadata |
| `backend/src/api/web.py` | MODIFY | Add 3 new endpoints |
| `frontend/js/components/ConfigModal.js` | CREATE | Modal component |
| `frontend/css/components/modal.css` | CREATE | Modal styles |
| `frontend/css/main.css` | MODIFY | Add modal import |
| `frontend/js/pages/ToolsPage.js` | MODIFY | Add configure button + modal |
| `frontend/css/pages/tools.css` | MODIFY | Add button/status styles |

---

## Success Criteria

- [ ] Tools page shows "Needs Setup" status for unconfigured servers
- [ ] Shows which env vars are missing on each card
- [ ] Click configure opens modal with form fields
- [ ] Help links open in new tab
- [ ] Password fields have show/hide toggle
- [ ] Save writes to `.env` file
- [ ] Enable updates `mcp_config.json`
- [ ] After save, triggers MCP reload
- [ ] Modal has smooth open/close animations
- [ ] Works on mobile (responsive)

---

## Security Considerations

1. **Backend only** - All config changes happen server-side
2. **No secrets in response** - API never returns actual credential values
3. **File permissions** - `.env` file permissions preserved
4. **Validation** - Server validates input before saving
5. **No eval** - No dynamic code execution

---

## Future Enhancements (Phase 2)

- [ ] OAuth flow with browser redirect for Google/Slack
- [ ] "Test Connection" button before saving
- [ ] "Disconnect" to clear credentials
- [ ] Import/export configuration
- [ ] Server logs/debug view

---

*Plan created: December 2025*
