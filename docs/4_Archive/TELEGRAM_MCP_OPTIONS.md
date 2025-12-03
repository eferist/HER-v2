# Telegram MCP Server Options

A comparison of available MCP servers for Telegram integration using Telethon/MTProto.

---

## Quick Recommendation

| Priority | Server | Why |
|----------|--------|-----|
| **1st Choice** | chigwell/telegram-mcp | Most complete, 50+ tools, full Telethon features |
| **2nd Choice** | dryeab/mcp-telegram | PyPI package, easy install, good balance |
| **3rd Choice** | Muhammad18557/telegram-mcp | Great for search-focused use cases |

---

## Prerequisites (All Options)

### Get Telegram API Credentials

1. Go to [my.telegram.org/apps](https://my.telegram.org/apps)
2. Log in with your phone number
3. Create a new application
4. Copy your **API ID** and **API Hash**

### Add to .env

```bash
TELEGRAM_API_ID=<your-api-id>
TELEGRAM_API_HASH=<your-api-hash>
```

---

## Option 1: chigwell/telegram-mcp (Most Complete)

**Best for: Full Telegram automation, all features**

| Attribute | Value |
|-----------|-------|
| Library | Telethon (MTProto) |
| Language | Python |
| Tools | 50+ tools |
| Install | Git clone + uv |

### Features

#### Chat & Group Management
| Tool | Description |
|------|-------------|
| `get_chats()` | Paginated chat list |
| `list_chats()` | Chats with filtering |
| `create_group()` | Create new group |
| `create_channel()` | Create new channel |
| `ban_user()` | Ban user from chat |
| `promote_admin()` | Make user admin |
| `get_invite_link()` | Get chat invite link |
| `join_chat_by_link()` | Join via invite link |

#### Messaging
| Tool | Description |
|------|-------------|
| `send_message()` | Send message |
| `reply_to_message()` | Reply to specific message |
| `edit_message()` | Edit existing message |
| `delete_message()` | Delete message |
| `forward_message()` | Forward to another chat |
| `pin_message()` | Pin message in chat |
| `list_messages()` | Get message history |
| `search_messages()` | Search within chats |

#### Contact Management
| Tool | Description |
|------|-------------|
| `list_contacts()` | List all contacts |
| `search_contacts()` | Search contacts |
| `add_contact()` | Add new contact |
| `delete_contact()` | Remove contact |
| `block_user()` | Block user |
| `unblock_user()` | Unblock user |
| `import_contacts()` | Bulk import |
| `export_contacts()` | Export contacts |

#### User & Profile
| Tool | Description |
|------|-------------|
| `get_me()` | Your account info |
| `update_profile()` | Modify profile |
| `get_user_status()` | Check online status |

#### Privacy & Settings
| Tool | Description |
|------|-------------|
| `mute_chat()` | Mute notifications |
| `unmute_chat()` | Unmute notifications |
| `archive_chat()` | Archive chat |
| `get_privacy_settings()` | View privacy settings |
| `set_privacy_settings()` | Update privacy |

### Installation

```bash
# Clone repository
git clone https://github.com/chigwell/telegram-mcp.git
cd telegram-mcp

# Install dependencies
uv sync

# Generate session string (first time only)
uv run session_string_generator.py
```

### Config for mcp_config.json

```json
{
  "telegram": {
    "command": "uv",
    "args": [
      "--directory",
      "/path/to/telegram-mcp",
      "run",
      "main.py"
    ],
    "env": {
      "TELEGRAM_API_ID": "${TELEGRAM_API_ID}",
      "TELEGRAM_API_HASH": "${TELEGRAM_API_HASH}",
      "TELEGRAM_SESSION_STRING": "${TELEGRAM_SESSION_STRING}"
    },
    "enabled": true,
    "description": "Full Telegram access via Telethon"
  }
}
```

### Docker Option

```bash
docker build -t telegram-mcp:latest .
docker run -it --rm \
  -e TELEGRAM_API_ID="your_id" \
  -e TELEGRAM_API_HASH="your_hash" \
  -e TELEGRAM_SESSION_STRING="your_session" \
  telegram-mcp:latest
```

### Source
- [GitHub - chigwell/telegram-mcp](https://github.com/chigwell/telegram-mcp)

---

## Option 2: dryeab/mcp-telegram (PyPI Package)

**Best for: Easy installation, good feature balance**

| Attribute | Value |
|-----------|-------|
| Library | Telethon (MTProto) |
| Language | Python |
| Package | `mcp-telegram` (PyPI) |
| Stars | 192 |
| Downloads | 1.6K+ |

### Features

| Tool | Description |
|------|-------------|
| `send_message` | Send messages |
| `edit_message` | Edit messages |
| `delete_message` | Delete messages |
| `get_messages` | Retrieve messages |
| `search_dialogs` | Search chats |
| `message_from_link` | Get message from link |
| `get_draft` | Get draft message |
| `set_draft` | Set draft message |
| `media_download` | Download media |

### Installation

```bash
# Install via uv
uv tool install mcp-telegram

# Or via pip
pip install mcp-telegram

# Login (first time)
mcp-telegram login
```

### Config for mcp_config.json

```json
{
  "telegram": {
    "command": "mcp-telegram",
    "args": ["start"],
    "env": {
      "API_ID": "${TELEGRAM_API_ID}",
      "API_HASH": "${TELEGRAM_API_HASH}"
    },
    "enabled": true,
    "description": "Telegram messaging via Telethon"
  }
}
```

### Source
- [GitHub - dryeab/mcp-telegram](https://github.com/dryeab/mcp-telegram)
- [PyPI - mcp-telegram](https://pypi.org/project/mcp-telegram/)
- [Awesome MCP Servers](https://mcpservers.org/servers/dryeab/mcp-telegram)

---

## Option 3: Muhammad18557/telegram-mcp (Search Focused)

**Best for: Message search, contact lookup, local storage**

| Attribute | Value |
|-----------|-------|
| Library | Telethon |
| Language | Python |
| Storage | Local SQLite |

### Features

| Tool | Description |
|------|-------------|
| `search_contacts` | Find contacts by name/username |
| `list_messages` | Retrieve messages with filters |
| `list_chats` | Display chats with metadata |
| `get_message_context` | Context around specific message |
| `get_last_interaction` | Most recent message with contact |

### Privacy Model

Messages stored locally in SQLite database. Only sent to LLM when you explicitly use tools.

### Installation

```bash
git clone https://github.com/Muhammad18557/telegram-mcp.git
cd telegram-mcp
pip install -r requirements.txt
```

### Config for mcp_config.json

```json
{
  "telegram-search": {
    "command": "python",
    "args": ["/path/to/telegram-mcp/main.py"],
    "env": {
      "TELEGRAM_API_ID": "${TELEGRAM_API_ID}",
      "TELEGRAM_API_HASH": "${TELEGRAM_API_HASH}"
    },
    "enabled": true,
    "description": "Telegram search and contacts"
  }
}
```

### Source
- [GitHub - Muhammad18557/telegram-mcp](https://github.com/Muhammad18557/telegram-mcp)

---

## Option 4: sparfenyuk/mcp-telegram (Read-Only)

**Best for: Safe read-only access, minimal risk**

| Attribute | Value |
|-----------|-------|
| Library | Telethon (MTProto) |
| Language | Python |
| Access | Read-only |

### Features

| Tool | Description |
|------|-------------|
| `get_dialogs` | List of chats, channels, groups |
| `get_messages` | Messages in a dialog |
| `get_unread_messages` | Unread messages only |

### Installation

```bash
uv tool install git+https://github.com/sparfenyuk/mcp-telegram

# Sign in
mcp-telegram sign-in --api-id <ID> --api-hash <HASH> --phone-number <NUMBER>
```

### Config for mcp_config.json

```json
{
  "telegram-readonly": {
    "command": "mcp-server",
    "env": {
      "TELEGRAM_API_ID": "${TELEGRAM_API_ID}",
      "TELEGRAM_API_HASH": "${TELEGRAM_API_HASH}"
    },
    "enabled": true,
    "description": "Read-only Telegram access"
  }
}
```

### Source
- [GitHub - sparfenyuk/mcp-telegram](https://github.com/sparfenyuk/mcp-telegram)

---

## Comparison Matrix

| Server | Install | Send Msg | Search Msg | Contacts | Groups | Read-Only |
|--------|---------|----------|------------|----------|--------|-----------|
| chigwell | git+uv | Yes | Yes | Yes | Yes | No |
| dryeab | pip/uv | Yes | Yes | Limited | Limited | No |
| Muhammad18557 | git+pip | No | Yes | Yes | No | Yes |
| sparfenyuk | uv | No | Yes | No | No | Yes |

---

## Security Warnings

1. **API Credentials**: Keep `API_ID` and `API_HASH` private
2. **Session Files**: Don't share session strings - they give full account access
3. **ToS Compliance**: Review [Telegram ToS](https://core.telegram.org/api/terms) - misuse may suspend your account
4. **Single Instance**: Don't run multiple instances with same session file (causes SQLite lock errors)
5. **2FA**: If you have 2FA enabled, you'll need your password during setup

---

## Setup Steps Summary

1. Get API credentials from [my.telegram.org/apps](https://my.telegram.org/apps)
2. Add `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` to `.env`
3. Choose a server and install it
4. Run initial authentication (enter code sent to Telegram)
5. Add config to `mcp_config.json`
6. Restart orchestrator or `mcp:reload`

---

## Example Queries After Setup

```
> Search my Telegram contacts for "John"        # search_contacts
> Get my unread messages                        # get_messages
> List my recent chats                          # list_chats / get_dialogs
> Send message to @username: "Hello!"           # send_message
> Search messages containing "meeting"          # search_messages
```

---

## References

- [Telegram API Portal](https://my.telegram.org/apps)
- [Telegram API Terms of Service](https://core.telegram.org/api/terms)
- [Telethon Documentation](https://docs.telethon.dev/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
