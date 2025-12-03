/**
 * API Service Module
 * Handles REST API calls to the backend
 */

import CONFIG from '../core/config.js';

class ApiService {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
    }

    /**
     * Make a fetch request with error handling
     */
    async _fetch(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const mergedOptions = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, mergedOptions);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[API] Error fetching ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Get server status
     */
    async getStatus() {
        return this._fetch(CONFIG.ENDPOINTS.STATUS);
    }

    /**
     * Get MCP servers list
     */
    async getMcpServers() {
        return this._fetch(CONFIG.ENDPOINTS.MCP_SERVERS);
    }

    /**
     * Reload MCP configuration
     */
    async reloadMcp() {
        return this._fetch(CONFIG.ENDPOINTS.MCP_RELOAD, { method: 'POST' });
    }

    /**
     * Get memories
     */
    async getMemories() {
        return this._fetch(CONFIG.ENDPOINTS.MEMORY);
    }

    /**
     * Search memories
     */
    async searchMemories(query) {
        return this._fetch(`${CONFIG.ENDPOINTS.MEMORY_SEARCH}?q=${encodeURIComponent(query)}`);
    }

    /**
     * Clear memory
     */
    async clearMemory() {
        return this._fetch(CONFIG.ENDPOINTS.MEMORY_CLEAR, { method: 'POST' });
    }
}

// Singleton instance
export const api = new ApiService();
