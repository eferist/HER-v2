/**
 * Configuration Module
 * Centralized configuration for API endpoints
 */

const CONFIG = {
    // API base URL - defaults to localhost:8000 for development
    API_HOST: 'localhost',
    API_PORT: 8000,

    // Computed URLs
    get API_BASE_URL() {
        return `http://${this.API_HOST}:${this.API_PORT}`;
    },

    get WS_URL() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${this.API_HOST}:${this.API_PORT}/ws`;
    },

    // API endpoints
    ENDPOINTS: {
        STATUS: '/api/status',
        MCP_RELOAD: '/api/mcp/reload',
        MCP_SERVERS: '/api/mcp/servers',
        MEMORY: '/api/memory',
        MEMORY_SEARCH: '/api/memory/search',
        MEMORY_CLEAR: '/api/memory/clear',
    }
};

export default CONFIG;
