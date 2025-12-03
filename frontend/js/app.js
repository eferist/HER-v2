/**
 * Main Application Controller
 * Orchestrates all modules and handles the app lifecycle
 */

import CONFIG from './config.js';
import { WebSocketClient } from './websocket.js';
import { ChatModule } from './chat.js';
import { SidebarModule } from './sidebar.js';
import { ActivityModule } from './activity.js';

class App {
    constructor() {
        // Use configured WebSocket URL (pointing to backend)
        const wsUrl = CONFIG.WS_URL;
        console.log('[App] Connecting to:', wsUrl);

        // Initialize modules
        this.ws = new WebSocketClient(wsUrl);

        this.chat = new ChatModule(
            document.getElementById('chatArea'),
            document.getElementById('textInput'),
            document.getElementById('sendBtn')
        );

        this.sidebar = new SidebarModule(
            document.getElementById('sidebar'),
            document.getElementById('rightSidebar'),
            document.getElementById('sidebarToggle'),
            document.getElementById('rightSidebarToggle')
        );

        this.activity = new ActivityModule(
            document.getElementById('activityContainer')
        );

        // View elements
        this.views = {
            chat: document.getElementById('chatArea'),
            memory: document.getElementById('graphArea')
        };
    }

    async init() {
        console.log('[App] Initializing...');

        // Initialize modules
        this.chat.init();
        this.sidebar.init();

        // Set up event handlers
        this._setupWebSocketHandlers();
        this._setupChatHandlers();
        this._setupViewHandlers();

        // Connect to WebSocket
        try {
            await this.ws.connect();
            this.sidebar.updateStatus('connected', 'Connected');
            this.activity.addCard('Ready', 'Connected to server', 'complete', false);
        } catch (error) {
            console.error('[App] WebSocket connection failed:', error);
            this.sidebar.updateStatus('error', 'Connection failed');
            this.activity.addCard('Error', 'Failed to connect', 'error', false);
        }

        console.log('[App] Ready');
    }

    _setupWebSocketHandlers() {
        // Handle status changes
        this.ws.onStatus((status) => {
            switch (status) {
                case 'connected':
                    this.sidebar.updateStatus('connected', 'Connected');
                    break;
                case 'disconnected':
                    this.sidebar.updateStatus('error', 'Disconnected');
                    break;
                case 'reconnecting':
                    this.sidebar.updateStatus('', 'Reconnecting...');
                    break;
                case 'failed':
                    this.sidebar.updateStatus('error', 'Connection lost');
                    break;
            }
        });

        // Handle incoming messages
        this.ws.onMessage((message) => {
            this.chat.setWaiting(false);

            if (message.type === 'response') {
                this.chat.addMessage(message.content, 'ai');
            } else if (message.type === 'error') {
                this.chat.addMessage(message.content, 'ai');
                this.activity.addCard('Error', 'Request failed', 'error', false);
            }
        });

        // Handle activity events
        this.ws.onActivity((event) => {
            this.activity.handleEvent(event);

            // Auto-open activity panel on first activity
            if (!this.sidebar.isRightOpen) {
                this.sidebar.openRight();
            }
        });
    }

    _setupChatHandlers() {
        this.chat.onSend((content) => {
            // Send to server
            const sent = this.ws.sendChat(content);

            if (sent) {
                this.chat.setWaiting(true);
            } else {
                this.chat.addMessage('Unable to send message. Please check your connection.', 'ai');
            }
        });
    }

    _setupViewHandlers() {
        this.sidebar.onViewChange((view) => {
            // Hide all views
            Object.values(this.views).forEach(el => {
                el.classList.add('view-hidden');
            });

            // Show selected view
            if (this.views[view]) {
                this.views[view].classList.remove('view-hidden');
            }
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
