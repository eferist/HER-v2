/**
 * State Module
 * Simple global state management
 */

class State {
    constructor() {
        this._state = {
            // Connection state
            connection: 'disconnected', // 'connected', 'disconnected', 'reconnecting', 'error'

            // Current page
            currentPage: 'chat',

            // Chat state (persists across page switches)
            chat: {
                messages: [],
                isWaiting: false
            },

            // Memory page state
            memory: {
                items: [],
                searchQuery: '',
                isLoading: false
            },

            // Tools page state
            tools: {
                servers: [],
                isLoading: false
            }
        };

        this._listeners = new Map();
    }

    /**
     * Get state value
     * @param {string} key - Dot-notation path (e.g., 'chat.isWaiting')
     */
    get(key) {
        const keys = key.split('.');
        let value = this._state;
        for (const k of keys) {
            if (value === undefined) return undefined;
            value = value[k];
        }
        return value;
    }

    /**
     * Set state value
     * @param {string} key - Dot-notation path
     * @param {*} value - Value to set
     */
    set(key, value) {
        const keys = key.split('.');
        let current = this._state;

        for (let i = 0; i < keys.length - 1; i++) {
            if (current[keys[i]] === undefined) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }

        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;

        // Notify listeners
        this._notifyListeners(key, value, oldValue);
    }

    /**
     * Subscribe to state changes
     * @param {string} key - Key to watch (or '*' for all)
     * @param {Function} callback - Called with (newValue, oldValue, key)
     * @returns {Function} Unsubscribe function
     */
    subscribe(key, callback) {
        if (!this._listeners.has(key)) {
            this._listeners.set(key, new Set());
        }
        this._listeners.get(key).add(callback);

        // Return unsubscribe function
        return () => {
            this._listeners.get(key)?.delete(callback);
        };
    }

    _notifyListeners(key, newValue, oldValue) {
        // Notify specific key listeners
        this._listeners.get(key)?.forEach(cb => cb(newValue, oldValue, key));

        // Notify wildcard listeners
        this._listeners.get('*')?.forEach(cb => cb(newValue, oldValue, key));

        // Notify parent key listeners (e.g., 'chat' when 'chat.isWaiting' changes)
        const parts = key.split('.');
        if (parts.length > 1) {
            const parentKey = parts.slice(0, -1).join('.');
            this._notifyListeners(parentKey, this.get(parentKey), undefined);
        }
    }
}

// Singleton instance
export const state = new State();
