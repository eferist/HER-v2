# Weather MCP Server Options

A comparison of available MCP servers for weather functionality.

---

## Quick Recommendation

| Priority | Server | Why |
|----------|--------|-----|
| **1st Choice** | mcp-weather-free | No API key, npm install, full features |
| **2nd Choice** | mcp_weather_server | No API key, Python-based, air quality included |
| **3rd Choice** | @timlukahorstmann/mcp-weather | AccuWeather (more accurate), requires free API key |

---

## Option 1: MCP Weather Free (microagents)

**Best for: Zero-config setup**

| Attribute | Value |
|-----------|-------|
| API | Open-Meteo (free) |
| API Key Required | No |
| Language | Node.js |
| Package | `@anthropics/mcp-weather-free` |

### Features
- Current weather (temperature, humidity, wind speed)
- 24-hour hourly forecast
- 7-day daily forecast
- City search with automatic geocoding

### Installation

```bash
npx -y @anthropics/mcp-weather-free
```

### Config for mcp_config.json

```json
{
  "weather-free": {
    "command": "npx",
    "args": ["-y", "@anthropics/mcp-weather-free"],
    "enabled": true,
    "description": "Weather data (no API key needed)"
  }
}
```

### Source
- [LobeHub MCP Servers](https://lobehub.com/mcp/microagents-mcp-weather-free)

---

## Option 2: mcp_weather_server (isdaniel)

**Best for: Python projects, air quality data**

| Attribute | Value |
|-----------|-------|
| API | Open-Meteo (free) |
| API Key Required | No |
| Language | Python |
| Package | `mcp_weather_server` |

### Features
- Current weather for any city
- Weather by datetime range (historical/forecast)
- Air quality monitoring (pollutant tracking)
- Timezone/datetime utilities
- Multiple transport modes (stdio, HTTP SSE, Streamable HTTP)

### Installation

```bash
pip install mcp_weather_server
```

### Config for mcp_config.json

```json
{
  "weather": {
    "command": "python",
    "args": ["-m", "mcp_weather_server"],
    "enabled": true,
    "description": "Weather, air quality, timezone data"
  }
}
```

### Tools Provided
| Tool | Description |
|------|-------------|
| `get_current_weather` | Real-time weather for a location |
| `get_weather_by_datetime_range` | Historical or forecast data |
| `get_air_quality` | Pollutant monitoring |
| `get_current_datetime` | Timezone-aware current time |

### Source
- [GitHub - isdaniel/mcp_weather_server](https://github.com/isdaniel/mcp_weather_server)
- [Playbooks MCP](https://playbooks.com/mcp/danielshih-weather)

---

## Option 3: @timlukahorstmann/mcp-weather (AccuWeather)

**Best for: More accurate forecasts, extended daily forecasts**

| Attribute | Value |
|-----------|-------|
| API | AccuWeather |
| API Key Required | Yes (free tier available) |
| Language | Node.js |
| Package | `@timlukahorstmann/mcp-weather` |

### Features
- 12-hour hourly forecasts
- Up to 15-day daily forecasts
- Metric (°C) and Imperial (°F) units
- Temperature, conditions, precipitation data

### Installation

```bash
npx -y @timlukahorstmann/mcp-weather
```

### Get API Key
1. Go to [AccuWeather Developer Portal](https://developer.accuweather.com/)
2. Create a free account
3. Create an app to get your API key

### Config for mcp_config.json

```json
{
  "accuweather": {
    "command": "npx",
    "args": ["-y", "@timlukahorstmann/mcp-weather"],
    "env": {
      "ACCUWEATHER_API_KEY": "${ACCUWEATHER_API_KEY}"
    },
    "enabled": true,
    "description": "AccuWeather forecasts (hourly/daily)"
  }
}
```

### Tools Provided
| Tool | Description |
|------|-------------|
| `weather-get_hourly` | 12-hour forecast |
| `weather-get_daily` | 1/5/10/15-day forecast |

### Source
- [GitHub - TimLukaHorstmann/mcp-weather](https://github.com/TimLukaHorstmann/mcp-weather)
- [Awesome MCP Servers](https://mcpservers.org/servers/TimLukaHorstmann/mcp-weather)

---

## Option 4: @dangahagan/weather-mcp

**Best for: Historical data, air quality, US-focused**

| Attribute | Value |
|-----------|-------|
| API | NOAA + Open-Meteo |
| API Key Required | No |
| Language | Node.js |
| Package | `@dangahagan/weather-mcp` |

### Features
- Archival data from 1940-present (Open-Meteo)
- NOAA integration for US weather
- Air quality monitoring worldwide
- No authentication needed

### Config for mcp_config.json

```json
{
  "weather-historical": {
    "command": "npx",
    "args": ["-y", "@dangahagan/weather-mcp"],
    "enabled": true,
    "description": "Weather history, NOAA, air quality"
  }
}
```

### Source
- [npm - @dangahagan/weather-mcp](https://www.npmjs.com/package/@dangahagan/weather-mcp)

---

## Option 5: OpenMeteo MCP Server (gbrigandi)

**Best for: Extended forecasts (16 days)**

| Attribute | Value |
|-----------|-------|
| API | Open-Meteo |
| API Key Required | No |
| Language | Node.js |

### Features
- Real-time weather (temp, humidity, precipitation, wind, atmospheric)
- 16-day forecast
- Daily temperature, precipitation, wind, conditions

### Source
- [LobeHub - OpenMeteo MCP Server](https://lobehub.com/mcp/gbrigandi-mcp-server-openmeteo)

---

## Comparison Matrix

| Server | API Key | Language | Current | Hourly | Daily | Air Quality | Historical |
|--------|---------|----------|---------|--------|-------|-------------|------------|
| mcp-weather-free | No | Node.js | Yes | 24h | 7d | No | No |
| mcp_weather_server | No | Python | Yes | Yes | Yes | Yes | Yes |
| @timlukahorstmann | Yes | Node.js | Yes | 12h | 15d | No | No |
| @dangahagan | No | Node.js | Yes | Yes | Yes | Yes | 1940+ |
| gbrigandi-openmeteo | No | Node.js | Yes | Yes | 16d | No | No |

---

## Integration Notes

### For Your Project

Your current `mcp_config.json` uses:
- `npx -y @modelcontextprotocol/server-*` pattern for Node.js servers
- Environment variable substitution with `${VAR_NAME}`

Recommended addition (simplest, no API key):

```json
{
  "servers": {
    "brave-search": { ... },
    "filesystem": { ... },
    "weather": {
      "command": "python",
      "args": ["-m", "mcp_weather_server"],
      "enabled": true,
      "description": "Weather, air quality, timezone data"
    }
  }
}
```

Or for Node.js consistency:

```json
{
  "weather": {
    "command": "npx",
    "args": ["-y", "@anthropics/mcp-weather-free"],
    "enabled": true,
    "description": "Weather data via Open-Meteo"
  }
}
```

### Setup Steps

1. Choose a server from options above
2. Add config block to `mcp_config.json`
3. If using Python server: `pip install mcp_weather_server`
4. If API key needed: Add to `.env` file
5. Restart orchestrator or run `mcp:reload`

---

## References

- [Model Context Protocol - Tools Spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [Open-Meteo API](https://open-meteo.com/)
- [AccuWeather Developer Portal](https://developer.accuweather.com/)
