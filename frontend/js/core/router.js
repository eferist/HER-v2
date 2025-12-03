/**
 * Router Module
 * Simple hash-based client-side routing
 */

export class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.onChangeCallbacks = [];
    }

    /**
     * Register a route
     * @param {string} path - Route path (e.g., 'chat', 'memory', 'tools')
     * @param {Function} handler - Handler function called when route matches
     */
    register(path, handler) {
        this.routes.set(path, handler);
    }

    /**
     * Initialize router and listen for hash changes
     */
    init() {
        // Listen for hash changes
        window.addEventListener('hashchange', () => this._handleRoute());

        // Handle initial route
        this._handleRoute();
    }

    /**
     * Navigate to a route
     * @param {string} path - Route to navigate to
     */
    navigate(path) {
        window.location.hash = `#/${path}`;
    }

    /**
     * Get current route
     * @returns {string} Current route path
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Register callback for route changes
     * @param {Function} callback - Called with (newRoute, oldRoute)
     */
    onChange(callback) {
        this.onChangeCallbacks.push(callback);
    }

    /**
     * Handle route change
     */
    _handleRoute() {
        const hash = window.location.hash;
        const path = hash.replace('#/', '') || 'chat'; // Default to chat

        const oldRoute = this.currentRoute;
        this.currentRoute = path;

        // Call route handler if registered
        const handler = this.routes.get(path);
        if (handler) {
            handler(path);
        }

        // Notify listeners
        this.onChangeCallbacks.forEach(cb => cb(path, oldRoute));
    }
}

// Singleton instance
export const router = new Router();
