# Tools Logic Blueprint

> **Recreation guide for rebuilding all tools from scratch.**
> This document captures the business logic, implementation patterns, and code templates needed to recreate each tool in the `tools/` folder.

---

## Table of Contents

1. [Framework & Dependencies](#framework--dependencies)
2. [Agno Toolkit Pattern](#agno-toolkit-pattern)
3. [DuckDuckGo Search Tool](#1-duckduckgo-search-tool)
4. [Telegram Tool (Bot API)](#2-telegram-tool-bot-api)
5. [Telethon Tool (Client API)](#3-telethon-tool-client-api)
6. [OpenWeather Tool](#4-openweather-tool)
7. [Geoapify Places Tool](#5-geoapify-places-tool)
8. [WebFetch Tool](#6-webfetch-tool)
9. [Cron Scheduler Tool](#7-cron-scheduler-tool)
10. [Spotify Tool](#8-spotify-tool)
11. [Google Calendar Tool](#9-google-calendar-tool)
12. [Tool Registry](#10-tool-registry)
13. [Authentication Scripts](#11-authentication-scripts)
14. [Environment & Config](#12-environment--config)

---

## Framework & Dependencies

### requirements.txt (Tool-Specific)

```txt
# Core framework
agno>=2.2.6

# Tool dependencies
requests>=2.31.0            # For Geoapify, OpenWeather, WebFetch
ddgs>=9.9.0                 # DuckDuckGo search (import as: from ddgs import DDGS)
telethon>=1.36.0            # Telegram Client API
croniter>=2.0.0             # Cron expression parsing
spotipy>=2.25.0             # Spotify API
beautifulsoup4>=4.12.0      # HTML parsing for WebFetch
pytz>=2024.1                # Timezone handling

# Environment
python-dotenv>=1.0.0
```

### Key Import Paths

```python
# Agno framework
from agno.tools import Toolkit                           # Base class for all tools
from agno.tools.duckduckgo import DuckDuckGoTools        # Pre-built DuckDuckGo
from agno.tools.telegram import TelegramTools            # Pre-built Telegram Bot
from agno.tools.openweather import OpenWeatherTools      # Pre-built OpenWeather
from agno.tools.googlecalendar import GoogleCalendarTools # Pre-built Google Calendar

# Third-party
from ddgs import DDGS                                    # DuckDuckGo search
from telethon import TelegramClient                      # Telegram Client API
from telethon.tl.functions.contacts import GetContactsRequest
from croniter import croniter                            # Cron parsing
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from bs4 import BeautifulSoup
```

---

## Agno Toolkit Pattern

All custom tools extend `agno.tools.Toolkit`. Here's the base pattern:

```python
from typing import List, Any
from agno.tools import Toolkit

class MyCustomTools(Toolkit):
    """
    Docstring describes the toolkit's purpose.
    """

    def __init__(self, api_key: str, **kwargs):
        # Store configuration
        self.api_key = api_key

        # Define which methods are exposed as tools
        # These become callable by the LLM agent
        tools: List[Any] = [
            self.my_tool_function,
            self.another_tool_function,
        ]

        # Initialize parent with toolkit name and tools list
        super().__init__(name="my_toolkit", tools=tools, **kwargs)

    def my_tool_function(self, param1: str, param2: int = 10) -> str:
        """
        Docstring becomes the tool description for the LLM.

        Args:
            param1: Description shown to LLM
            param2: Another param with default

        Returns:
            JSON string with results (convention: always return str)
        """
        import json

        try:
            # Do the work
            result = {"success": True, "data": "..."}
            return json.dumps(result)
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


# Factory function (convention used in registry)
def get_my_tool() -> MyCustomTools:
    """Returns configured MyCustomTools instance."""
    from config import MY_API_KEY
    return MyCustomTools(api_key=MY_API_KEY)
```

**Key Points:**
- `tools` list contains method references (not strings)
- Method docstrings are used by the LLM to understand the tool
- Return type is always `str` (usually JSON)
- Use `{"success": True/False, ...}` pattern for consistent error handling
- Factory function loads config and instantiates the tool

---

## 1. DuckDuckGo Search Tool

**File:** `tools/duckduckgo_tool.py`

### Purpose
Web search without API keys. Wraps Agno's built-in tool with reliability settings.

### Dependencies
```python
from agno.tools.duckduckgo import DuckDuckGoTools
```

### Config Required
None (keyless API)

### Implementation

```python
from agno.tools.duckduckgo import DuckDuckGoTools

def get_search_tool(max_results: int = 5, include_news: bool = False) -> DuckDuckGoTools:
    """Get configured DuckDuckGo search tool."""

    # Control which functions LLM can call
    tools_to_include = ["duckduckgo_search"]
    if include_news:
        tools_to_include.append("duckduckgo_news")

    return DuckDuckGoTools(
        fixed_max_results=max_results,
        timeout=10,
        backend="lite",      # CRITICAL: "lite" backend avoids SSL issues
        verify_ssl=True,
        include_tools=tools_to_include,  # Prevents LLM from calling both search and news
    )
```

### Critical Details
- `backend="lite"` is essential for reliability
- `include_tools` filters exposed functions (prevents duplicate searches)
- Stateless, no auth needed

---

## 2. Telegram Tool (Bot API)

**File:** `tools/telegram_tool.py`

### Purpose
Send notifications to YOUR OWN chat via Telegram Bot API. One-way messaging only.

### Dependencies
```python
from agno.tools.telegram import TelegramTools
```

### Config Required
```bash
TELEGRAM_TOKEN=bot_token_from_botfather
TELEGRAM_CHAT_ID=your_chat_id_with_bot
```

### Implementation

```python
from agno.tools.telegram import TelegramTools
from config import TELEGRAM_TOKEN, TELEGRAM_CHAT_ID

def get_telegram_tool(chat_id: str = None, token: str = None) -> TelegramTools:
    """Get configured Telegram tool for self-notifications."""
    return TelegramTools(
        chat_id=chat_id or TELEGRAM_CHAT_ID,
        token=token or TELEGRAM_TOKEN,
        enable_send_message=True,
    )
```

### Critical Details
- This is for **self-notifications only** (messages to your own chat)
- For messaging OTHER people, use Telethon Tool
- Get `TELEGRAM_CHAT_ID` by messaging your bot and calling `getUpdates` API

---

## 3. Telethon Tool (Client API)

**Files:** `tools/telethon_tool.py`, `tools/_telethon_helper.py`

### Purpose
Full Telegram account access: send to any contact, read messages, search contacts.

### Dependencies
```python
from telethon import TelegramClient
from telethon.tl.functions.contacts import GetContactsRequest
```

### Config Required
```bash
TELEGRAM_API_ID=from_my_telegram_org
TELEGRAM_API_HASH=from_my_telegram_org
```

### Session File
`tmp/telegram_tool_session.session` (created by auth script)

### Architecture
**Two-file design to avoid asyncio conflicts:**

1. `telethon_tool.py` - Toolkit wrapper, runs in main process
2. `_telethon_helper.py` - Actual Telethon code, runs in subprocess

### Main Tool Implementation (`telethon_tool.py`)

```python
import json
import subprocess
import sys
from pathlib import Path
from typing import List, Any, Optional
from agno.tools import Toolkit
from config import TELEGRAM_API_ID, TELEGRAM_API_HASH

SESSION_DIR = Path(__file__).parent.parent / "tmp"
SESSION_NAME = str(SESSION_DIR / "telegram_tool_session")
HELPER_SCRIPT = Path(__file__).parent / "_telethon_helper.py"

def _find_python_with_telethon() -> str:
    """Find Python executable that has telethon installed."""
    project_root = Path(__file__).parent.parent
    candidates = [
        str(project_root / "venv" / "Scripts" / "python.exe"),  # Windows
        str(project_root / "venv" / "bin" / "python"),          # Linux/Mac
        sys.executable,  # Fallback
    ]

    for python_path in candidates:
        if Path(python_path).exists():
            try:
                result = subprocess.run(
                    [python_path, "-c", "import telethon; print('ok')"],
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    return python_path
            except Exception:
                continue
    return sys.executable

PYTHON_EXECUTABLE = _find_python_with_telethon()


class TelethonTools(Toolkit):
    def __init__(self, api_id: str = None, api_hash: str = None, **kwargs):
        self.api_id = str(api_id or TELEGRAM_API_ID)
        self.api_hash = api_hash or TELEGRAM_API_HASH
        SESSION_DIR.mkdir(parents=True, exist_ok=True)
        self.session_name = SESSION_NAME

        tools: List[Any] = [
            self.search_contact,
            self.send_message,
            self.read_messages,
            self.get_dialogs,
            self.get_unread,
        ]
        super().__init__(name="telethon", tools=tools, **kwargs)

    def _run_helper(self, command: str, **kwargs) -> str:
        """Run telethon helper in subprocess to avoid event loop conflicts."""
        args = json.dumps({
            "command": command,
            "api_id": self.api_id,
            "api_hash": self.api_hash,
            "session_name": self.session_name,
            **kwargs
        })

        try:
            result = subprocess.run(
                [PYTHON_EXECUTABLE, str(HELPER_SCRIPT), args],
                capture_output=True, text=True, timeout=60
            )
            if result.returncode != 0:
                return json.dumps({"error": result.stderr or "Unknown error", "success": False})
            return result.stdout.strip()
        except subprocess.TimeoutExpired:
            return json.dumps({"error": "Request timed out", "success": False})

    def search_contact(self, query: str) -> str:
        """Search for a contact by name. Use FIRST before sending messages."""
        return self._run_helper("search_contact", query=query)

    def send_message(self, recipient: str, message: str) -> str:
        """Send message to any contact. recipient: @username, +phone, or chat ID."""
        return self._run_helper("send_message", recipient=recipient, message=message)

    def read_messages(self, chat: str, limit: int = 10) -> str:
        """Read recent messages from a chat."""
        return self._run_helper("read_messages", chat=chat, limit=limit)

    def get_dialogs(self, limit: int = 20) -> str:
        """Get list of all chats/conversations."""
        return self._run_helper("get_dialogs", limit=limit)

    def get_unread(self) -> str:
        """Get all chats with unread messages."""
        return self._run_helper("get_unread")
```

### Helper Script Implementation (`_telethon_helper.py`)

```python
#!/usr/bin/env python
"""Runs in subprocess to avoid asyncio conflicts."""
import sys
import json
import asyncio
from telethon import TelegramClient

async def run_command(args: dict) -> dict:
    command = args["command"]
    client = TelegramClient(
        args["session_name"],
        int(args["api_id"]),
        args["api_hash"]
    )

    try:
        await client.connect()

        if not await client.is_user_authorized():
            return {"error": "Not authenticated. Run telegram_auth.py first."}

        if command == "send_message":
            recipient = args["recipient"]
            # Handle numeric chat IDs
            target = int(recipient) if recipient.lstrip("-").isdigit() else recipient
            result = await client.send_message(target, args["message"])
            return {"success": True, "message_id": result.id}

        elif command == "read_messages":
            chat = args["chat"]
            target = int(chat) if str(chat).lstrip("-").isdigit() else chat
            messages = []
            async for msg in client.iter_messages(target, limit=args.get("limit", 10)):
                sender = getattr(msg.sender, 'username', None) or str(msg.sender_id)
                messages.append({
                    "id": msg.id,
                    "sender": sender,
                    "text": msg.text or "[media]",
                    "date": str(msg.date)
                })
            return messages

        elif command == "get_dialogs":
            dialogs = []
            async for dialog in client.iter_dialogs(limit=args.get("limit", 20)):
                dtype = "group" if dialog.is_group else "channel" if dialog.is_channel else "user"
                dialogs.append({
                    "name": dialog.name,
                    "id": dialog.id,
                    "unread_count": dialog.unread_count,
                    "type": dtype
                })
            return dialogs

        elif command == "get_unread":
            unread = []
            async for dialog in client.iter_dialogs():
                if dialog.unread_count > 0:
                    dtype = "group" if dialog.is_group else "channel" if dialog.is_channel else "user"
                    unread.append({
                        "chat": dialog.name,
                        "chat_id": dialog.id,
                        "unread_count": dialog.unread_count,
                        "type": dtype
                    })
            return unread

        elif command == "search_contact":
            query = args["query"].lower()
            matches = []
            seen = set()

            # Search dialogs
            async for dialog in client.iter_dialogs():
                if query in (dialog.name or "").lower() and dialog.id not in seen:
                    seen.add(dialog.id)
                    dtype = "group" if dialog.is_group else "channel" if dialog.is_channel else "user"
                    matches.append({"name": dialog.name, "id": dialog.id, "type": dtype})

            # Search contacts
            from telethon.tl.functions.contacts import GetContactsRequest
            contacts = await client(GetContactsRequest(hash=0))
            for user in contacts.users:
                name = f"{user.first_name or ''} {user.last_name or ''}".strip().lower()
                if (query in name or query in (user.username or "").lower()) and user.id not in seen:
                    seen.add(user.id)
                    matches.append({
                        "name": f"{user.first_name or ''} {user.last_name or ''}".strip(),
                        "id": user.id,
                        "username": user.username,
                        "type": "contact"
                    })

            # Return plain text for clarity
            if len(matches) == 1:
                m = matches[0]
                return f"FOUND: {m['name']} - ID: {m['id']}"
            elif matches:
                lines = [f"{i+1}. {m['name']} - ID: {m['id']}" for i, m in enumerate(matches)]
                return f"MULTIPLE MATCHES:\n" + "\n".join(lines)
            else:
                return f"NO MATCHES for '{args['query']}'"

        return {"error": f"Unknown command: {command}"}

    finally:
        await client.disconnect()

def main():
    args = json.loads(sys.argv[1])
    result = asyncio.run(run_command(args))
    print(result if isinstance(result, str) else json.dumps(result))

if __name__ == "__main__":
    main()
```

### Critical Details
- **Subprocess isolation is mandatory** - Telethon's asyncio conflicts with Agno's event loop
- Session file must exist (run auth script first)
- `search_contact` returns plain text (not JSON) to prevent LLM misinterpretation
- Chat IDs: positive = user, negative = group/channel

---

## 4. OpenWeather Tool

**Files:** `tools/openweather_tool.py`, `tools/city_coordinates.py`

### Purpose
Weather data with **custom geocoding** to fix Agno's unreliable city lookups.

### Dependencies
```python
import requests
from agno.tools import Toolkit
from agno.tools.openweather import OpenWeatherTools  # Fallback
```

### Config Required
```bash
OPENWEATHER_API_KEY=from_openweathermap_org
```

### City Coordinates Helper (`city_coordinates.py`)

```python
from typing import Optional, Dict

CITY_COORDINATES: Dict[str, Dict] = {
    # Indonesia
    "bali": {"lat": -8.4095, "lon": 115.1889, "name": "Bali, Indonesia"},
    "jakarta": {"lat": -6.2088, "lon": 106.8456, "name": "Jakarta, Indonesia"},
    "yogyakarta": {"lat": -7.7956, "lon": 110.3695, "name": "Yogyakarta, Indonesia"},
    # Japan
    "tokyo": {"lat": 35.6762, "lon": 139.6503, "name": "Tokyo, Japan"},
    # Add more cities as needed...
}

def lookup_coordinates(city: str) -> Optional[Dict]:
    """Case-insensitive city lookup with partial matching."""
    if not city:
        return None

    normalized = city.lower().strip()

    # Remove country suffixes
    for suffix in [", indonesia", ", japan", ", usa"]:
        if normalized.endswith(suffix):
            normalized = normalized[:-len(suffix)].strip()

    # Direct match
    if normalized in CITY_COORDINATES:
        return CITY_COORDINATES[normalized]

    # Partial match
    for key in CITY_COORDINATES:
        if key in normalized:
            return CITY_COORDINATES[key]

    return None
```

### Main Tool Implementation

```python
import requests
from datetime import datetime
from typing import List, Any
from agno.tools import Toolkit
from agno.tools.openweather import OpenWeatherTools
from config import OPENWEATHER_API_KEY
from .city_coordinates import lookup_coordinates

class CustomOpenWeatherTools(Toolkit):
    def __init__(self, api_key: str, units: str = "metric", **kwargs):
        self.api_key = api_key
        self.units = units
        self.base_url = "https://api.openweathermap.org/data/2.5"

        # Agno tool as fallback for unknown cities
        self._agno_tool = OpenWeatherTools(
            api_key=api_key, units=units,
            enable_current_weather=True, enable_forecast=True
        )

        tools: List[Any] = [self.get_current_weather, self.get_weather_forecast]
        super().__init__(name="openweather", tools=tools, **kwargs)

    def get_current_weather(self, location: str) -> str:
        """Get current weather for a location."""
        coords = lookup_coordinates(location)

        if coords:
            return self._fetch_weather_by_coords(coords)
        else:
            # Fallback to Agno's geocoding
            try:
                return self._agno_tool.get_current_weather(location)
            except Exception as e:
                return f"Could not get weather for '{location}': {e}"

    def _fetch_weather_by_coords(self, coords: dict) -> str:
        """Direct API call with coordinates."""
        url = f"{self.base_url}/weather"
        params = {
            "lat": coords["lat"], "lon": coords["lon"],
            "appid": self.api_key, "units": self.units
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        sunrise = datetime.fromtimestamp(data["sys"]["sunrise"]).strftime("%H:%M")
        sunset = datetime.fromtimestamp(data["sys"]["sunset"]).strftime("%H:%M")

        return f"""Weather for {coords['name']}:
Temperature: {data['main']['temp']}°C (feels like {data['main']['feels_like']}°C)
Conditions: {data['weather'][0]['description'].title()}
Humidity: {data['main']['humidity']}%
Wind: {data['wind']['speed']} m/s
Sunrise: {sunrise}, Sunset: {sunset}"""

    def get_weather_forecast(self, location: str, days: int = 3) -> str:
        """Get weather forecast."""
        coords = lookup_coordinates(location)
        if coords:
            return self._fetch_forecast_by_coords(coords, days)
        else:
            try:
                return self._agno_tool.get_forecast_weather(location)
            except Exception as e:
                return f"Could not get forecast: {e}"

    def _fetch_forecast_by_coords(self, coords: dict, days: int = 3) -> str:
        """Forecast API call."""
        url = f"{self.base_url}/forecast"
        params = {
            "lat": coords["lat"], "lon": coords["lon"],
            "appid": self.api_key, "units": self.units,
            "cnt": min(days * 8, 40)
        }

        response = requests.get(url, params=params, timeout=10)
        data = response.json()

        forecasts = []
        seen_dates = set()
        for item in data["list"]:
            dt = datetime.fromtimestamp(item["dt"])
            date_str = dt.strftime("%Y-%m-%d")
            if date_str not in seen_dates and len(seen_dates) < days:
                seen_dates.add(date_str)
                forecasts.append(f"  {dt.strftime('%a %b %d')}: {item['main']['temp']}°C, {item['weather'][0]['description']}")

        return f"Forecast for {coords['name']}:\n" + "\n".join(forecasts)


def get_openweather_tool():
    return CustomOpenWeatherTools(api_key=OPENWEATHER_API_KEY, units="metric")
```

### Critical Details
- Local coordinate lookup fixes "Bali returns Paris" bug in Agno
- Falls back to Agno's geocoder for unknown cities
- Returns formatted string, not JSON
- Metric units (Celsius) by default

---

## 5. Geoapify Places Tool

**File:** `tools/geoapify_tool.py`

### Purpose
Find places near a location with **automatic DuckDuckGo fallback** when API results are insufficient.

### Dependencies
```python
import requests
from ddgs import DDGS
from agno.tools import Toolkit
```

### Config Required
```bash
GEOAPIFY_API_KEY=from_geoapify_com
```

### Implementation

```python
import json
import requests
from typing import Optional, List, Any
from agno.tools import Toolkit
from ddgs import DDGS
from config import GEOAPIFY_API_KEY

PLACE_CATEGORIES = {
    "restaurant": "catering.restaurant",
    "cafe": "catering.cafe",
    "hotel": "accommodation.hotel",
    "supermarket": "commercial.supermarket",
    "pharmacy": "commercial.chemist",
    "hospital": "healthcare.hospital",
    "atm": "service.financial.atm",
}

# Brand inference map
BRAND_INFERENCE = {
    "starbucks": "cafe", "mcdonald": "fast_food", "kfc": "fast_food",
    "indomaret": "supermarket", "alfamart": "supermarket",
}


class GeoapifyPlacesTools(Toolkit):
    def __init__(self, api_key: str = None, **kwargs):
        self.api_key = api_key or GEOAPIFY_API_KEY
        self.places_url = "https://api.geoapify.com/v2/places"
        self.geocode_url = "https://api.geoapify.com/v1/geocode/search"

        tools: List[Any] = [self.find_places]
        super().__init__(name="geoapify", tools=tools, **kwargs)

    def _geocode_location(self, location: str) -> Optional[dict]:
        """Convert location name to coordinates."""
        params = {"text": location, "limit": 1, "apiKey": self.api_key}
        response = requests.get(self.geocode_url, params=params, timeout=30)
        data = response.json()

        features = data.get("features", [])
        if not features:
            return None

        coords = features[0].get("geometry", {}).get("coordinates", [])
        props = features[0].get("properties", {})
        return {
            "lon": coords[0], "lat": coords[1],
            "formatted": props.get("formatted", location)
        }

    def _results_are_relevant(self, query: str, results: list) -> bool:
        """Check if results match the query keywords."""
        if not results:
            return False

        ignore = {"find", "search", "near", "restaurant", "cafe", "hotel"}
        keywords = [w for w in query.lower().split() if w not in ignore and len(w) > 2]

        if not keywords:
            return True  # Generic query

        for place in results:
            text = f"{place.get('name', '')} {place.get('address', '')}".lower()
            if any(kw in text for kw in keywords):
                return True
        return False

    def find_places(self, what: str, where: str, radius_meters: int = 2000, limit: int = 20) -> str:
        """
        Find places near a location. Falls back to web search if needed.

        Args:
            what: What to find (e.g., "gudeg", "starbucks")
            where: Location (e.g., "wijilan yogyakarta")
        """
        primary_results = []
        fallback_used = False
        web_results = []

        # Step 1: Geocode
        geo = self._geocode_location(where)
        if not geo:
            fallback_used = True
        else:
            # Step 2: Determine category
            what_lower = what.lower()
            category = "restaurant"
            for brand, cat in BRAND_INFERENCE.items():
                if brand in what_lower:
                    category = cat
                    break

            resolved_cat = PLACE_CATEGORIES.get(category, category)

            # Step 3: Search places
            params = {
                "categories": resolved_cat,
                "filter": f"circle:{geo['lon']},{geo['lat']},{radius_meters}",
                "limit": limit,
                "apiKey": self.api_key
            }
            params["name"] = what  # Name filter

            response = requests.get(self.places_url, params=params, timeout=30)
            data = response.json()

            for feature in data.get("features", []):
                props = feature.get("properties", {})
                coords = feature.get("geometry", {}).get("coordinates", [0, 0])
                primary_results.append({
                    "name": props.get("name", "Unknown"),
                    "address": props.get("formatted", ""),
                    "lat": coords[1], "lon": coords[0],
                    "website": props.get("website"),
                    "phone": props.get("contact", {}).get("phone"),
                })

            # Step 4: Check relevance
            if not self._results_are_relevant(what, primary_results):
                fallback_used = True

        # Step 5: DuckDuckGo fallback
        if fallback_used or not primary_results:
            search_query = f"{what} {where}"
            region = "id-id" if geo and "Indonesia" in geo.get("formatted", "") else "wt-wt"

            with DDGS() as ddgs:
                web_results = list(ddgs.text(search_query, region=region, max_results=10))

        return json.dumps({
            "query": what, "location": where,
            "primary_results": primary_results,
            "fallback_used": fallback_used,
            "web_results": web_results,
        })


def get_geoapify_tool():
    return GeoapifyPlacesTools(api_key=GEOAPIFY_API_KEY)
```

### Critical Details
- **Smart fallback** supplements limited POI data with web search
- Category inference handles common brands
- Region detection improves local search results
- Returns both structured data AND web results

---

## 6. WebFetch Tool

**File:** `tools/webfetch_tool.py`

### Purpose
Fetch and extract readable content from URLs. **Works as pipeline after DuckDuckGo.**

### Dependencies
```python
import requests
from bs4 import BeautifulSoup
```

### Config Required
None

### Implementation

```python
import json
import re
from typing import List
from agno.tools import Toolkit


class WebFetchTools(Toolkit):
    def __init__(self, max_urls: int = 3, timeout: int = 30, **kwargs):
        self.max_urls = max_urls
        self.timeout = timeout

        tools = [self.fetch_from_search_results, self.fetch_url]
        super().__init__(name="webfetch", tools=tools, **kwargs)

    def _extract_urls_from_text(self, text: str) -> List[str]:
        """Extract URLs from JSON search results or plain text."""
        urls = []

        # Try JSON parsing (DuckDuckGo format)
        try:
            data = json.loads(text)
            if isinstance(data, list):
                for item in data:
                    href = item.get("href") or item.get("url") or item.get("link")
                    if href and href.startswith("http"):
                        urls.append(href)
        except json.JSONDecodeError:
            pass

        # Regex fallback
        regex_urls = re.findall(r'https?://[^\s<>"\'}\]]+', text)
        for url in regex_urls:
            url = url.rstrip('.,;:')
            if url not in urls:
                urls.append(url)

        return urls

    def fetch_from_search_results(self, search_results: str) -> str:
        """Extract URLs from search results and fetch their content."""
        urls = self._extract_urls_from_text(search_results)

        if not urls:
            return json.dumps({"error": "No URLs found", "success": False})

        results = []
        for url in urls[:self.max_urls]:
            results.append(json.loads(self.fetch_url(url)))

        return json.dumps({
            "urls_fetched": len(results),
            "results": results
        })

    def fetch_url(self, url: str) -> str:
        """Fetch and extract content from a URL."""
        import requests
        from bs4 import BeautifulSoup

        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"
            }
            response = requests.get(url, headers=headers, timeout=self.timeout)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, "html.parser")

            # Remove noise
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()

            # Find main content
            main = None
            for selector in ["main", "article", '[role="main"]', ".content"]:
                main = soup.select_one(selector)
                if main:
                    break

            if not main:
                main = soup.body or soup

            text = main.get_text(separator="\n", strip=True)

            # CRITICAL: Truncate to avoid token overflow
            if len(text) > 5000:
                text = text[:5000] + "... [truncated]"

            return json.dumps({
                "url": url,
                "title": soup.title.string if soup.title else "",
                "content": text,
                "success": True
            })

        except Exception as e:
            return json.dumps({"url": url, "error": str(e), "success": False})


def get_webfetch_tool(max_urls: int = 3):
    return WebFetchTools(max_urls=max_urls)
```

### Critical Details
- **5000 char truncation** prevents token overflow
- Removes noise elements (nav, footer, etc.)
- Handles DuckDuckGo JSON format directly
- `max_urls=3` by default to limit fetching

---

## 7. Cron Scheduler Tool

**Files:** `tools/cron_tool.py`, `scheduler/time_parser.py`, `scheduler/models.py`

### Purpose
Schedule prompts to run later. Supports natural language, relative time, and cron expressions.

### Dependencies
```python
from croniter import croniter
import sqlite3
```

### Database
`tmp/scheduler.db` (auto-created)

### Time Parser (`scheduler/time_parser.py`)

```python
import re
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

def parse_time_expression(expr: str) -> Dict[str, Any]:
    """
    Parse time expressions into schedule config.

    Returns: {"type": "cron"|"datetime", "cron": str, "run_at": str, "one_time": bool}
    """
    expr_lower = expr.lower().strip()

    # Already cron? (5 space-separated parts)
    if len(expr.split()) == 5 and all(re.match(r'^[\d\*\-,/]+$', p) for p in expr.split()):
        return {"type": "cron", "cron": expr, "one_time": False}

    # Relative: "in 10 minutes"
    match = re.match(r'^in\s+(\d+)\s*(minutes?|hours?|seconds?)', expr_lower)
    if match:
        amount = int(match.group(1))
        unit = match.group(2)

        if unit.startswith('min'):
            delta = timedelta(minutes=amount)
        elif unit.startswith('hour'):
            delta = timedelta(hours=amount)
        else:
            delta = timedelta(seconds=amount)

        return {
            "type": "datetime",
            "run_at": (datetime.now() + delta).isoformat(),
            "one_time": True
        }

    # Natural: "5am", "4pm daily"
    is_recurring = any(x in expr_lower for x in ['daily', 'every day', 'weekdays'])
    time_expr = re.sub(r'\s*(daily|every\s*day).*$', '', expr_lower).strip()

    # Parse 12-hour: "5am", "5:30pm"
    match = re.match(r'^(\d{1,2}):?(\d{2})?\s*(am|pm)$', time_expr)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        if match.group(3) == 'pm' and hour != 12:
            hour += 12
        elif match.group(3) == 'am' and hour == 12:
            hour = 0

        cron = f"{minute} {hour} * * *"

        if not is_recurring:
            # Check if time is in future today
            target = datetime.now().replace(hour=hour, minute=minute, second=0)
            if target > datetime.now():
                return {"type": "datetime", "run_at": target.isoformat(), "one_time": True}

        return {"type": "cron", "cron": cron, "one_time": False}

    raise ValueError(f"Cannot parse: '{expr}'")


def get_next_run(schedule_type: str, cron_expression: str = None, run_at: str = None) -> Optional[str]:
    """Calculate next run time."""
    if schedule_type == "datetime" and run_at:
        return run_at

    if schedule_type == "cron" and cron_expression:
        from croniter import croniter
        cron = croniter(cron_expression, datetime.now())
        return cron.get_next(datetime).isoformat()

    return None
```

### Database Model (`scheduler/models.py`)

```python
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from dataclasses import dataclass
from uuid import uuid4

@dataclass
class ScheduledJob:
    id: str
    name: str
    prompt: str
    schedule_type: str
    cron_expression: Optional[str]
    run_at: Optional[str]
    one_time: bool
    enabled: bool
    user_id: str
    created_at: str
    last_run: Optional[str]
    next_run: Optional[str]


class SchedulerDB:
    def __init__(self, db_path: str = "tmp/scheduler.db"):
        self.db_path = db_path
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS scheduled_jobs (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    prompt TEXT NOT NULL,
                    schedule_type TEXT NOT NULL,
                    cron_expression TEXT,
                    run_at TEXT,
                    one_time INTEGER DEFAULT 0,
                    enabled INTEGER DEFAULT 1,
                    user_id TEXT DEFAULT 'default_user',
                    created_at TEXT NOT NULL,
                    last_run TEXT,
                    next_run TEXT
                )
            """)

    def add_job(self, prompt: str, schedule_type: str, cron_expression: str = None,
                run_at: str = None, one_time: bool = False, name: str = None,
                user_id: str = "default_user", next_run: str = None) -> ScheduledJob:
        job_id = str(uuid4())[:8]
        created_at = datetime.now().isoformat()
        name = name or f"Job {job_id}"

        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO scheduled_jobs
                (id, name, prompt, schedule_type, cron_expression, run_at, one_time, enabled, user_id, created_at, next_run)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
            """, (job_id, name, prompt, schedule_type, cron_expression, run_at, 1 if one_time else 0, user_id, created_at, next_run))

        return ScheduledJob(id=job_id, name=name, prompt=prompt, schedule_type=schedule_type,
                           cron_expression=cron_expression, run_at=run_at, one_time=one_time,
                           enabled=True, user_id=user_id, created_at=created_at, last_run=None, next_run=next_run)

    def get_due_jobs(self) -> List[ScheduledJob]:
        """Get jobs where next_run <= now."""
        now = datetime.now().isoformat()
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT * FROM scheduled_jobs WHERE enabled = 1 AND next_run <= ?", (now,)
            ).fetchall()
            # Convert rows to ScheduledJob objects...
```

### Main Tool Implementation

```python
import json
from typing import List, Any
from agno.tools import Toolkit
from scheduler.models import SchedulerDB
from scheduler.time_parser import parse_time_expression, get_next_run


class CronTools(Toolkit):
    def __init__(self, db_path: str = "tmp/scheduler.db", user_id: str = "default_user", **kwargs):
        self.db = SchedulerDB(db_path)
        self.user_id = user_id

        tools: List[Any] = [
            self.preview_schedule,
            self.schedule,
            self.list_schedules,
            self.delete_schedule,
        ]
        super().__init__(name="cron", tools=tools, **kwargs)

    def preview_schedule(self, prompt: str, time: str, name: str = None) -> str:
        """Preview schedule WITHOUT creating it. Use first, then confirm."""
        try:
            parsed = parse_time_expression(time)
            next_run = get_next_run(parsed["type"], parsed.get("cron"), parsed.get("run_at"))

            return json.dumps({
                "preview": True,
                "name": name or "Scheduled task",
                "prompt": prompt,
                "schedule_type": parsed["type"],
                "one_time": parsed.get("one_time", False),
                "next_run": next_run,
                "message": f"Ready to schedule. Next run: {next_run}. Confirm?"
            })
        except ValueError as e:
            return json.dumps({"preview": True, "success": False, "error": str(e)})

    def schedule(self, prompt: str, time: str, name: str = None) -> str:
        """Create the scheduled job."""
        try:
            parsed = parse_time_expression(time)
            next_run = get_next_run(parsed["type"], parsed.get("cron"), parsed.get("run_at"))

            job = self.db.add_job(
                prompt=prompt,
                schedule_type=parsed["type"],
                cron_expression=parsed.get("cron"),
                run_at=parsed.get("run_at"),
                one_time=parsed.get("one_time", False),
                name=name,
                user_id=self.user_id,
                next_run=next_run
            )

            return json.dumps({
                "success": True,
                "job_id": job.id,
                "name": job.name,
                "next_run": job.next_run,
            })
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    def list_schedules(self) -> str:
        """List all scheduled tasks."""
        jobs = self.db.get_all_jobs(user_id=self.user_id)
        return json.dumps({
            "success": True,
            "schedules": [{"id": j.id, "name": j.name, "next_run": j.next_run} for j in jobs]
        })

    def delete_schedule(self, job_id: str) -> str:
        """Delete a scheduled task."""
        deleted = self.db.delete_job(job_id)
        return json.dumps({"success": deleted})


def get_cron_tool(user_id: str = "default_user"):
    return CronTools(user_id=user_id)
```

### Critical Details
- **Two-step workflow**: `preview_schedule()` → user confirms → `schedule()`
- `one_time=True` means delete after execution
- External daemon must poll `get_due_jobs()` and execute prompts

---

## 8. Spotify Tool

**File:** `tools/spotify_tool.py`

### Purpose
Full Spotify control with **graceful degradation** for Free accounts.

### Dependencies
```python
import spotipy
from spotipy.oauth2 import SpotifyOAuth
import webbrowser
```

### Config Required
```bash
SPOTIFY_CLIENT_ID=from_developer_spotify_com
SPOTIFY_CLIENT_SECRET=from_developer_spotify_com
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback
```

### Token File
`tmp/.spotify_cache` (created by auth script)

### OAuth Scopes
```python
SCOPES = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "playlist-read-private",
    "playlist-read-collaborative",
]
```

### Implementation

```python
import json
import webbrowser
from typing import List, Any, Optional
from pathlib import Path
from agno.tools import Toolkit
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from spotipy.exceptions import SpotifyException
from config import SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI

CACHE_DIR = Path(__file__).parent.parent / "tmp"
CACHE_PATH = str(CACHE_DIR / ".spotify_cache")

SCOPES = [
    "user-read-playback-state", "user-modify-playback-state",
    "user-read-currently-playing", "playlist-read-private", "playlist-read-collaborative"
]


class SpotifyTools(Toolkit):
    def __init__(self, **kwargs):
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

        self.auth_manager = SpotifyOAuth(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET,
            redirect_uri=SPOTIFY_REDIRECT_URI,
            scope=" ".join(SCOPES),
            cache_path=CACHE_PATH,
            open_browser=False  # Don't auto-open during tool use
        )
        self.sp = spotipy.Spotify(auth_manager=self.auth_manager)

        tools: List[Any] = [
            self.search_spotify, self.search_my_playlists,
            self.play_track, self.play_playlist,
            self.pause_playback, self.resume_playback,
            self.skip_track, self.get_current_playback,
        ]
        super().__init__(name="spotify", tools=tools, **kwargs)

    def _ensure_device(self) -> bool:
        """Ensure active device exists. Returns True if available."""
        try:
            devices = self.sp.devices()
            if not any(d.get('is_active') for d in devices.get('devices', [])):
                available = devices.get('devices', [])
                if available:
                    self.sp.transfer_playback(available[0]['id'], force_play=False)
                    return True
                return False
            return True
        except Exception:
            return False

    def search_spotify(self, query: str, search_type: str = "track") -> str:
        """Search Spotify catalog."""
        try:
            results = self.sp.search(q=query, type=search_type, limit=10)
            items = results.get(f"{search_type}s", {}).get('items', [])

            formatted = []
            for item in items:
                if search_type == "track":
                    formatted.append({
                        "name": item['name'],
                        "id": item['id'],
                        "artist": ", ".join(a['name'] for a in item.get('artists', [])),
                        "uri": item['uri']
                    })
                # Handle other types similarly...

            return json.dumps({"success": True, "results": formatted})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    def search_my_playlists(self, query: str) -> str:
        """Search user's playlists by name (partial match)."""
        try:
            playlists = []
            offset = 0
            while True:
                results = self.sp.current_user_playlists(limit=50, offset=offset)
                playlists.extend(results['items'])
                if not results['next']:
                    break
                offset += 50

            matches = [
                {"name": p['name'], "id": p['id'], "track_count": p['tracks']['total']}
                for p in playlists if query.lower() in p['name'].lower()
            ]

            return json.dumps({"success": True, "matches": matches})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    def play_track(self, track_id: str) -> str:
        """Play a track. Falls back to browser for Free users."""
        try:
            if not self._ensure_device():
                raise SpotifyException(http_status=404, code=-1, msg="No device")

            self.sp.start_playback(uris=[f"spotify:track:{track_id}"])
            track = self.sp.track(track_id)

            return json.dumps({
                "success": True,
                "method": "api",
                "now_playing": {"track": track['name'], "artist": track['artists'][0]['name']}
            })

        except SpotifyException as e:
            if "Premium" in str(e) or "404" in str(e):
                # Fallback: open in browser
                url = f"https://open.spotify.com/track/{track_id}"
                webbrowser.open(url)
                return json.dumps({"success": True, "method": "browser", "url": url})
            return json.dumps({"success": False, "error": str(e)})

    def play_playlist(self, playlist_id: str) -> str:
        """Play a playlist. Falls back to browser for Free users."""
        try:
            if not self._ensure_device():
                raise SpotifyException(http_status=404, code=-1, msg="No device")

            self.sp.start_playback(context_uri=f"spotify:playlist:{playlist_id}")
            return json.dumps({"success": True, "method": "api"})

        except SpotifyException as e:
            if "Premium" in str(e) or "404" in str(e):
                url = f"https://open.spotify.com/playlist/{playlist_id}"
                webbrowser.open(url)
                return json.dumps({"success": True, "method": "browser", "url": url})
            return json.dumps({"success": False, "error": str(e)})

    def pause_playback(self) -> str:
        """Pause playback (Premium only)."""
        try:
            self.sp.pause_playback()
            return json.dumps({"success": True})
        except SpotifyException as e:
            return json.dumps({"success": False, "error": "Requires Premium" if "Premium" in str(e) else str(e)})

    def resume_playback(self) -> str:
        """Resume playback (Premium only)."""
        try:
            self.sp.start_playback()
            return json.dumps({"success": True})
        except SpotifyException as e:
            return json.dumps({"success": False, "error": str(e)})

    def skip_track(self) -> str:
        """Skip to next track (Premium only)."""
        try:
            self.sp.next_track()
            import time; time.sleep(0.5)  # Wait for Spotify to update
            return json.dumps({"success": True})
        except SpotifyException as e:
            return json.dumps({"success": False, "error": str(e)})

    def get_current_playback(self) -> str:
        """Get currently playing track."""
        try:
            current = self.sp.current_playback()
            if not current or not current.get('item'):
                return json.dumps({"success": True, "is_playing": False})

            return json.dumps({
                "success": True,
                "is_playing": current.get('is_playing', False),
                "track": current['item']['name'],
                "artist": current['item']['artists'][0]['name'],
            })
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})


def get_spotify_tool():
    return SpotifyTools()
```

### Critical Details
- **Graceful degradation**: Free users get `webbrowser.open()` fallback
- `open_browser=False` in OAuth prevents popup during tool use
- 0.5s sleep after skip for Spotify to update
- Check `"method": "api"` vs `"browser"` in response

---

## 9. Google Calendar Tool

**File:** `tools/google_calendar_tool.py`

### Purpose
Calendar management wrapping Agno's tool with better formatting.

### Dependencies
```python
from agno.tools.googlecalendar import GoogleCalendarTools as AgnoGoogleCalendarTools
import pytz
```

### Config Required
```bash
GOOGLE_CLIENT_ID=from_cloud_console
GOOGLE_CLIENT_SECRET=from_cloud_console
```

### Token File
`tmp/.google_calendar_token.json` (created by auth script)

### Implementation

```python
import json
from typing import List, Any, Optional
from pathlib import Path
from datetime import datetime, timedelta
from agno.tools import Toolkit
from agno.tools.googlecalendar import GoogleCalendarTools as AgnoGoogleCalendarTools
import pytz

CACHE_DIR = Path(__file__).parent.parent / "tmp"
TOKEN_PATH = str(CACHE_DIR / ".google_calendar_token.json")


class GoogleCalendarTools(Toolkit):
    def __init__(self, calendar_id: str = "primary", allow_update: bool = True, **kwargs):
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

        self._agno_tool = AgnoGoogleCalendarTools(
            token_path=TOKEN_PATH,
            calendar_id=calendar_id,
            allow_update=allow_update,
            oauth_port=9090,
        )

        tools: List[Any] = [
            self.get_current_datetime,
            self.get_todays_events,
            self.list_events,
            self.create_event,
            self.find_and_update_event,
            self.delete_event,
        ]
        super().__init__(name="google_calendar", tools=tools, **kwargs)

    def get_current_datetime(self) -> str:
        """Get current date/time with reference dates."""
        tz = pytz.timezone('Asia/Jakarta')
        now = datetime.now(tz)
        tomorrow = now + timedelta(days=1)

        return json.dumps({
            "success": True,
            "current": {
                "date": now.strftime('%Y-%m-%d'),
                "time": now.strftime('%H:%M'),
                "day_of_week": now.strftime('%A'),
            },
            "reference_dates": {
                "tomorrow": tomorrow.strftime('%Y-%m-%d'),
            }
        })

    def get_todays_events(self) -> str:
        """Get today's events."""
        tz = pytz.timezone('Asia/Jakarta')
        now = datetime.now(tz)
        start = now.replace(hour=0, minute=0, second=0).isoformat()
        end = (now.replace(hour=0, minute=0, second=0) + timedelta(days=1)).isoformat()

        result = self._agno_tool.fetch_all_events(start_date=start, end_date=end)
        events = json.loads(result)

        if isinstance(events, list):
            if not events:
                return json.dumps({"success": True, "message": "No events today.", "events": []})

            formatted = [{"title": e.get('summary', 'No title'), "start": e.get('start', {}).get('dateTime')} for e in events]
            return json.dumps({"success": True, "events": formatted})

        return result

    def list_events(self, limit: int = 10) -> str:
        """List upcoming events."""
        result = self._agno_tool.list_events(limit=limit)
        data = json.loads(result)

        if isinstance(data, list):
            formatted = [{"title": e.get('summary'), "start": e.get('start', {}).get('dateTime'), "id": e.get('id')} for e in data]
            return json.dumps({"success": True, "events": formatted})

        return json.dumps({"success": True, "message": "No upcoming events.", "events": []})

    def create_event(self, start_date: str, end_date: str, title: str = None,
                     description: str = None, location: str = None,
                     add_google_meet_link: bool = False) -> str:
        """Create a calendar event."""
        result = self._agno_tool.create_event(
            start_date=start_date, end_date=end_date,
            title=title, description=description, location=location,
            timezone="Asia/Jakarta",
            add_google_meet_link=add_google_meet_link,
        )

        data = json.loads(result)
        if "error" in data:
            return result

        return json.dumps({"success": True, "message": f"Event '{title}' created!", "event": data})

    def find_and_update_event(self, search_title: str, new_start_time: str = None,
                              new_end_time: str = None, new_title: str = None) -> str:
        """Find event by title and update it."""
        # List events
        events_result = self._agno_tool.list_events(limit=50)
        events = json.loads(events_result)

        if not isinstance(events, list):
            return json.dumps({"success": False, "error": "No events found"})

        # Search
        matches = [e for e in events if search_title.lower() in e.get('summary', '').lower()]

        if len(matches) == 0:
            return json.dumps({"success": False, "error": f"No events matching '{search_title}'"})
        if len(matches) > 1:
            return json.dumps({"success": False, "error": "Multiple matches found", "matches": [e['summary'] for e in matches]})

        # Update
        event = matches[0]
        result = self._agno_tool.update_event(
            event_id=event['id'],
            title=new_title,
            start_date=new_start_time,
            end_date=new_end_time,
        )

        return json.dumps({"success": True, "message": f"Event '{event['summary']}' updated!"})

    def delete_event(self, event_id: str) -> str:
        """Delete a calendar event."""
        result = self._agno_tool.delete_event(event_id=event_id)
        return json.dumps({"success": True, "message": "Event deleted!"})


def get_google_calendar_tool():
    return GoogleCalendarTools()
```

### Critical Details
- **Timezone hardcoded to `Asia/Jakarta`** - change as needed
- `find_and_update_event` handles "reschedule X" use case
- Wraps Agno tool with better response formatting

---

## 10. Tool Registry

**File:** `tools/registry.py`

### Purpose
Central registry for tool discovery and instantiation.

### Implementation

```python
from typing import List, Any

from .duckduckgo_tool import get_search_tool
from .telegram_tool import get_telegram_tool
from .telethon_tool import get_telethon_tool
from .openweather_tool import get_openweather_tool
from .geoapify_tool import get_geoapify_tool
from .webfetch_tool import get_webfetch_tool
from .cron_tool import get_cron_tool
from .spotify_tool import get_spotify_tool
from .google_calendar_tool import get_google_calendar_tool

TOOL_REGISTRY = {
    "duckduckgo": {
        "factory": lambda: get_search_tool(),
        "description": "for searching info, news, prices"
    },
    "telegram": {
        "factory": lambda: get_telegram_tool(),
        "description": "for sending notifications TO YOURSELF"
    },
    "telethon": {
        "factory": lambda: get_telethon_tool(),
        "description": "for messaging Telegram CONTACTS - search, send, read messages"
    },
    "openweather": {
        "factory": lambda: get_openweather_tool(),
        "description": "for weather information and forecasts"
    },
    "geoapify": {
        "factory": lambda: get_geoapify_tool(),
        "description": "for finding places like restaurants, hotels near a location"
    },
    "webfetch": {
        "factory": lambda: get_webfetch_tool(),
        "description": "for fetching content from URLs after search"
    },
    "cron": {
        "factory": lambda: get_cron_tool(),
        "description": "for scheduling tasks - alarms, reminders, recurring messages"
    },
    "spotify": {
        "factory": lambda: get_spotify_tool(),
        "description": "for playing music - search, play, control playback"
    },
    "google_calendar": {
        "factory": lambda: get_google_calendar_tool(),
        "description": "for managing calendar events"
    },
}


def get_tool_by_name(tool_name: str) -> Any:
    """Instantiate a tool by name."""
    if tool_name not in TOOL_REGISTRY:
        raise ValueError(f"Unknown tool: '{tool_name}'")
    return TOOL_REGISTRY[tool_name]["factory"]()


def list_available_tools() -> str:
    """Format tools with descriptions for prompt injection."""
    tool_list = list(TOOL_REGISTRY.keys())
    descriptions = [f"   - {name}: {info['description']}" for name, info in TOOL_REGISTRY.items()]
    return f"{tool_list}\n" + "\n".join(descriptions)


def get_tool_names() -> List[str]:
    """Return list of tool names."""
    return list(TOOL_REGISTRY.keys())
```

---

## 11. Authentication Scripts

### `scripts/telegram_auth.py`

```python
"""Run once to authenticate Telegram account with Telethon."""
import asyncio
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from telethon import TelegramClient
from config import TELEGRAM_API_ID, TELEGRAM_API_HASH

SESSION_DIR = Path(__file__).parent.parent / "tmp"
SESSION_NAME = str(SESSION_DIR / "telegram_tool_session")

async def main():
    SESSION_DIR.mkdir(parents=True, exist_ok=True)

    client = TelegramClient(SESSION_NAME, int(TELEGRAM_API_ID), TELEGRAM_API_HASH)
    await client.connect()

    if await client.is_user_authorized():
        me = await client.get_me()
        print(f"Already authenticated as: {me.first_name}")
    else:
        print("Starting authentication - check your Telegram app for code...")
        await client.start()  # Interactive: asks for phone, code
        me = await client.get_me()
        print(f"Authenticated as: {me.first_name}")

    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

### `scripts/spotify_auth.py`

```python
"""Run once to authenticate Spotify account."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

import spotipy
from spotipy.oauth2 import SpotifyOAuth
from config import SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REDIRECT_URI

CACHE_DIR = Path(__file__).parent.parent / "tmp"
CACHE_PATH = str(CACHE_DIR / ".spotify_cache")

SCOPES = [
    "user-read-playback-state", "user-modify-playback-state",
    "user-read-currently-playing", "playlist-read-private", "playlist-read-collaborative"
]

def main():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    auth_manager = SpotifyOAuth(
        client_id=SPOTIFY_CLIENT_ID,
        client_secret=SPOTIFY_CLIENT_SECRET,
        redirect_uri=SPOTIFY_REDIRECT_URI,
        scope=" ".join(SCOPES),
        cache_path=CACHE_PATH,
        open_browser=True  # Opens browser for OAuth
    )

    sp = spotipy.Spotify(auth_manager=auth_manager)
    user = sp.current_user()
    print(f"Authenticated as: {user['display_name']}")

if __name__ == "__main__":
    main()
```

### `scripts/google_calendar_auth.py`

```python
"""Run once to authenticate Google Calendar."""
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from agno.tools.googlecalendar import GoogleCalendarTools

CACHE_DIR = Path(__file__).parent.parent / "tmp"
TOKEN_PATH = str(CACHE_DIR / ".google_calendar_token.json")

def main():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    tool = GoogleCalendarTools(
        token_path=TOKEN_PATH,
        allow_update=True,
        oauth_port=9090,
    )

    # Test by listing calendars
    result = json.loads(tool.list_calendars())
    print(f"Authenticated! Calendars: {len(result.get('calendars', []))}")

if __name__ == "__main__":
    main()
```

---

## 12. Environment & Config

### `.env` Template

```bash
# Core LLM
GEMINI_API_KEY=your_gemini_api_key

# Telegram Bot (for self-notifications)
TELEGRAM_TOKEN=bot_token_from_botfather
TELEGRAM_CHAT_ID=your_chat_id

# Telegram Client API (for messaging others)
TELEGRAM_API_ID=from_my_telegram_org
TELEGRAM_API_HASH=from_my_telegram_org

# Weather & Places
OPENWEATHER_API_KEY=from_openweathermap_org
GEOAPIFY_API_KEY=from_geoapify_com

# Spotify
SPOTIFY_CLIENT_ID=from_developer_spotify_com
SPOTIFY_CLIENT_SECRET=from_developer_spotify_com
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback

# Google Calendar
GOOGLE_CLIENT_ID=from_cloud_console
GOOGLE_CLIENT_SECRET=from_cloud_console
```

### `config.py`

```python
import os
from dotenv import load_dotenv

load_dotenv()

# Core
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Telegram
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
TELEGRAM_API_ID = os.getenv("TELEGRAM_API_ID")
TELEGRAM_API_HASH = os.getenv("TELEGRAM_API_HASH")

# Weather & Places
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
GEOAPIFY_API_KEY = os.getenv("GEOAPIFY_API_KEY")

# Spotify
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI", "http://127.0.0.1:8888/callback")
```

### `utils/logger.py`

```python
from rich.console import Console

console = Console()

FLAG_COLORS = {
    "WEATHER": "cyan",
    "GEOAPIFY": "green",
    "TELETHON": "bright_blue",
    "ERROR": "red",
}

def log(flag: str, message: str):
    """Print colored log message."""
    color = FLAG_COLORS.get(flag, "white")
    console.print(f"[[{color}]{flag}[/{color}]] {message}")
```

---

## File Structure Summary

```
project/
├── tools/
│   ├── __init__.py
│   ├── registry.py              # Tool registry
│   ├── duckduckgo_tool.py       # Web search
│   ├── telegram_tool.py         # Bot notifications
│   ├── telethon_tool.py         # Client messaging
│   ├── _telethon_helper.py      # Subprocess helper
│   ├── openweather_tool.py      # Weather
│   ├── city_coordinates.py      # Geocoding helper
│   ├── geoapify_tool.py         # Places search
│   ├── webfetch_tool.py         # URL content
│   ├── cron_tool.py             # Scheduling
│   ├── spotify_tool.py          # Music control
│   └── google_calendar_tool.py  # Calendar
├── scheduler/
│   ├── models.py                # SQLite DB
│   └── time_parser.py           # Natural language parsing
├── scripts/
│   ├── telegram_auth.py
│   ├── spotify_auth.py
│   └── google_calendar_auth.py
├── utils/
│   └── logger.py
├── tmp/                         # Token/session files (gitignored)
├── config.py
├── requirements.txt
└── .env
```

---

## Quick Recreation Checklist

1. **Install dependencies**: `pip install agno ddgs telethon croniter spotipy beautifulsoup4 pytz python-dotenv`
2. **Create `.env`** with required API keys
3. **Create `config.py`** to load environment
4. **Create `utils/logger.py`** for logging
5. **Implement tools** following the patterns above
6. **Create `tools/registry.py`** to register all tools
7. **Run auth scripts** for Spotify, Google Calendar, Telethon
8. **Test each tool** individually before integrating
