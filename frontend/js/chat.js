/**
 * Chat Module
 * Handles chat interface rendering and interactions
 */

export class ChatModule {
    constructor(containerEl, inputEl, sendBtnEl) {
        this.container = containerEl;
        this.input = inputEl;
        this.sendBtn = sendBtnEl;
        this.isWaiting = false;
        this.onSendCallback = null;
    }

    init() {
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
        this.container.appendChild(messageEl);

        this._scrollToBottom();
    }

    showTypingIndicator() {
        if (this.container.querySelector('.typing-indicator')) return;

        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        this.container.appendChild(indicator);

        this._scrollToBottom();
    }

    removeTypingIndicator() {
        const indicator = this.container.querySelector('.typing-indicator');
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
            this.container.scrollTop = this.container.scrollHeight;
        });
    }

    onSend(callback) {
        this.onSendCallback = callback;
    }

    clear() {
        // Keep only the welcome message
        const messages = this.container.querySelectorAll('.message');
        messages.forEach((msg, index) => {
            if (index > 0) msg.remove();
        });
    }
}
