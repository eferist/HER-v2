/**
 * Chat Page
 * Handles chat interface rendering and interactions
 */

import { BasePage } from './BasePage.js';

export class ChatPage extends BasePage {
    constructor(container, inputEl, sendBtnEl) {
        super(container);
        this.input = inputEl;
        this.sendBtn = sendBtnEl;
        this.chatArea = null;
        this.activityFeed = null;
        this.isWaiting = false;
        this.onSendCallback = null;
    }

    mount() {
        super.mount();

        // Create chat area if not exists
        if (!this.chatArea) {
            this.chatArea = this.createElement('div', 'chat-area');
            this.chatArea.id = 'chatArea';

            // Add welcome message
            const welcomeMsg = this.createElement('div', 'message ai');
            welcomeMsg.innerHTML = '<div class="message-content">Hi! I\'m your JIT assistant. How can I help you today?</div>';
            this.chatArea.appendChild(welcomeMsg);
        }

        this.container.innerHTML = '';
        this.container.appendChild(this.chatArea);

        // Setup input handlers
        this._setupInputHandlers();
    }

    unmount() {
        super.unmount();
        // Keep chatArea reference to preserve messages
    }

    _setupInputHandlers() {
        // Remove old listeners by cloning
        const newInput = this.input.cloneNode(true);
        this.input.parentNode.replaceChild(newInput, this.input);
        this.input = newInput;

        const newBtn = this.sendBtn.cloneNode(true);
        this.sendBtn.parentNode.replaceChild(newBtn, this.sendBtn);
        this.sendBtn = newBtn;

        // Handle Enter key
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this._handleSend();
            }
        });

        // Handle send button click
        this.sendBtn.addEventListener('click', () => {
            this._handleSend();
        });
    }

    _handleSend() {
        const content = this.input.value.trim();
        if (!content || this.isWaiting) return;

        // Add user message
        this.addMessage(content, 'user');

        // Clear input
        this.input.value = '';

        // Notify callback
        if (this.onSendCallback) {
            this.onSendCallback(content);
        }
    }

    addMessage(content, sender) {
        // Remove typing indicator if present
        this.removeTypingIndicator();

        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';
        contentEl.textContent = content;

        messageEl.appendChild(contentEl);
        this.chatArea.appendChild(messageEl);

        this._scrollToBottom();
    }

    showTypingIndicator() {
        if (this.chatArea.querySelector('.typing-indicator')) return;

        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        this.chatArea.appendChild(indicator);

        this._scrollToBottom();
    }

    removeTypingIndicator() {
        const indicator = this.chatArea?.querySelector('.typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    setWaiting(waiting) {
        this.isWaiting = waiting;
        this.sendBtn.disabled = waiting;
        this.input.disabled = waiting;

        if (waiting) {
            this.showTypingIndicator();
        } else {
            this.removeTypingIndicator();
            this.input.focus();
        }
    }

    _scrollToBottom() {
        requestAnimationFrame(() => {
            if (this.chatArea) {
                this.chatArea.scrollTop = this.chatArea.scrollHeight;
            }
        });
    }

    onSend(callback) {
        this.onSendCallback = callback;
    }

    // Handle incoming WebSocket messages
    onMessage(message) {
        this.setWaiting(false);
        this.clearActivityFeed();

        if (message.type === 'response') {
            this.addMessage(message.content, 'ai');
        } else if (message.type === 'error') {
            this.addMessage(message.content, 'ai');
        }
    }

    // Handle activity events from backend
    onActivity(event) {
        if (!event || !event.event) return;

        const message = this._formatActivityMessage(event);
        if (message) {
            this._addActivityItem(message);
        }

        // Clear on complete
        if (event.event === 'complete') {
            setTimeout(() => this.clearActivityFeed(), 500);
        }
    }

    _formatActivityMessage(event) {
        switch (event.event) {
            case 'thinking':
                return 'Processing...';
            case 'routing':
                return 'Analyzing request...';
            case 'routed':
                if (event.path === 'direct') {
                    return 'Route: direct response';
                }
                return `Route: using tools`;
            case 'responding':
                return 'Generating response...';
            case 'planning':
                return 'Planning workflow...';
            case 'planned':
                const count = event.subtasks?.length || 0;
                const tools = event.subtasks?.flatMap(s => s.tools || []).filter(Boolean);
                const toolStr = tools?.length ? ` (${tools.slice(0, 3).join(', ')}${tools.length > 3 ? '...' : ''})` : '';
                return `Plan: ${count} subtask${count !== 1 ? 's' : ''}${toolStr}`;
            case 'executing':
                return 'Executing...';
            case 'subtask_start':
                return `Running: ${event.id || 'subtask'}`;
            case 'subtask_complete':
                return `Done: ${event.id || 'subtask'}`;
            case 'complete':
                return 'Complete!';
            default:
                return event.message || null;
        }
    }

    _addActivityItem(text) {
        // Create feed if not exists
        if (!this.activityFeed) {
            this.activityFeed = document.createElement('div');
            this.activityFeed.className = 'activity-feed';
        }

        // Ensure feed is in DOM (before typing indicator)
        const typingIndicator = this.chatArea?.querySelector('.typing-indicator');
        if (this.activityFeed.parentNode !== this.chatArea) {
            if (typingIndicator) {
                this.chatArea.insertBefore(this.activityFeed, typingIndicator);
            } else {
                this.chatArea?.appendChild(this.activityFeed);
            }
        }

        // Mark previous items as completed
        const prevItems = this.activityFeed.querySelectorAll('.activity-item');
        prevItems.forEach(item => item.classList.add('completed'));

        // Add new item
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.textContent = text;
        this.activityFeed.appendChild(item);

        this._scrollToBottom();
    }

    clearActivityFeed() {
        if (this.activityFeed) {
            this.activityFeed.innerHTML = '';
            this.activityFeed.remove();
            this.activityFeed = null;
        }
    }

    clear() {
        // Keep only the welcome message
        if (this.chatArea) {
            const messages = this.chatArea.querySelectorAll('.message');
            messages.forEach((msg, index) => {
                if (index > 0) msg.remove();
            });
        }
    }
}
