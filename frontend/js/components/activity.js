/**
 * Activity Component
 * Handles the activity stream in the right sidebar
 */

export class ActivityComponent {
    constructor(containerEl) {
        this.container = containerEl;
        this.maxCards = 8;
    }

    /**
     * Add an activity card
     * @param {string} title - Card title
     * @param {string} desc - Card description
     * @param {string} iconType - Icon type: 'thinking', 'routing', 'planning', 'executing', 'tool', 'complete', 'error'
     * @param {boolean} isProcessing - Whether to show processing animation
     */
    addCard(title, desc, iconType = 'default', isProcessing = false) {
        const card = document.createElement('div');
        card.className = `activity-card ${isProcessing ? 'processing' : ''}`;

        const iconPath = this._getIconPath(iconType);

        card.innerHTML = `
            <div class="activity-icon">
                <svg class="icon" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>
            </div>
            <div class="activity-content">
                <div class="activity-title">${this._escapeHtml(title)}</div>
                <div class="activity-desc">${this._escapeHtml(desc)}</div>
            </div>
        `;

        // Insert at the top
        this.container.prepend(card);

        // Remove old cards
        this._cleanup();

        return card;
    }

    /**
     * Handle activity events from WebSocket
     */
    handleEvent(event) {
        const eventType = event.event;
        const data = event;

        switch (eventType) {
            case 'thinking':
                this.addCard('Thinking', data.message || 'Processing...', 'thinking', true);
                break;

            case 'routing':
                this.addCard('Routing', data.message || 'Analyzing request...', 'routing', true);
                break;

            case 'routed':
                const pathText = data.path === 'direct' ? 'Direct response' : 'Using tools';
                this.addCard('Route Decided', pathText, 'routing', false);
                break;

            case 'planning':
                this.addCard('Planning', data.message || 'Creating plan...', 'planning', true);
                break;

            case 'planned':
                const subtaskCount = data.subtasks?.length || 0;
                this.addCard('Plan Ready', `${subtaskCount} subtask(s) - ${data.mode}`, 'planning', false);
                break;

            case 'executing':
                this.addCard('Executing', data.message || 'Running...', 'executing', true);
                break;

            case 'tool_call':
                const toolStatus = data.status === 'running' ? true : false;
                this.addCard(data.tool || 'Tool', data.status || 'Processing', 'tool', toolStatus);
                break;

            case 'responding':
                this.addCard('Generating', data.message || 'Writing response...', 'thinking', true);
                break;

            case 'complete':
                this.addCard('Complete', data.message || 'Done', 'complete', false);
                break;

            case 'error':
                this.addCard('Error', data.message || 'Something went wrong', 'error', false);
                break;

            default:
                if (data.message) {
                    this.addCard(eventType || 'Activity', data.message, 'default', false);
                }
        }
    }

    _getIconPath(type) {
        const icons = {
            thinking: "M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z",
            routing: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
            planning: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
            executing: "M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z",
            tool: "M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z",
            complete: "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z",
            error: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
            default: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
        };
        return icons[type] || icons.default;
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    _cleanup() {
        while (this.container.children.length > this.maxCards) {
            this.container.lastElementChild.remove();
        }
    }

    clear() {
        this.container.innerHTML = '';
    }
}
