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

        if (message.type === 'response') {
            this.addMessage(message.content, 'ai');
        } else if (message.type === 'error') {
            this.addMessage(message.content, 'ai');
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
