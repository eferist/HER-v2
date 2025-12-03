/**
 * Base Page Class
 * Abstract base class for all pages
 */

export class BasePage {
    /**
     * @param {HTMLElement} container - The container element to mount into
     */
    constructor(container) {
        this.container = container;
        this.mounted = false;
    }

    /**
     * Mount the page - render HTML and setup event listeners
     * Override in subclasses
     */
    mount() {
        this.mounted = true;
        console.log(`[${this.constructor.name}] Mounted`);
    }

    /**
     * Unmount the page - cleanup event listeners and state
     * Override in subclasses
     */
    unmount() {
        this.mounted = false;
        console.log(`[${this.constructor.name}] Unmounted`);
    }

    /**
     * Handle WebSocket messages
     * Override in subclasses if page needs to respond to WS events
     * @param {Object} message - Message from WebSocket
     */
    onMessage(message) {
        // Override in subclass
    }

    /**
     * Handle activity events
     * Override in subclasses if page needs to respond to activity
     * @param {Object} event - Activity event from WebSocket
     */
    onActivity(event) {
        // Override in subclass
    }

    /**
     * Called when page becomes visible (navigated to)
     */
    onShow() {
        // Override in subclass
    }

    /**
     * Called when page becomes hidden (navigated away)
     */
    onHide() {
        // Override in subclass
    }

    /**
     * Utility: Create element with classes
     */
    createElement(tag, className, innerHTML = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (innerHTML) el.innerHTML = innerHTML;
        return el;
    }

    /**
     * Utility: Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
