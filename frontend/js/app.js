/**
 * Main Application Controller
 * Orchestrates all modules, routing, and page lifecycle
 */

import CONFIG from './core/config.js';
import { WebSocketClient } from './core/websocket.js';
import { router } from './core/router.js';
import { ChatPage } from './pages/ChatPage.js';
import { MemoryPage } from './pages/MemoryPage.js';
import { ToolsPage } from './pages/ToolsPage.js';
import { SidebarComponent } from './components/sidebar.js';
import { ActivityComponent } from './components/activity.js';

class App {
    constructor() {
        // WebSocket
        const wsUrl = CONFIG.WS_URL;
        console.log('[App] Connecting to:', wsUrl);
        this.ws = new WebSocketClient(wsUrl);

        // Get DOM elements
        this.pageContainer = document.getElementById('pageContainer');
        this.inputArea = document.querySelector('.input-area');
        this.textInput = document.getElementById('textInput');
        this.sendBtn = document.getElementById('sendBtn');

        // Initialize components
        this.sidebar = new SidebarComponent(
            document.getElementById('sidebar'),
            document.getElementById('rightSidebar'),
            document.getElementById('sidebarToggle'),
            document.getElementById('rightSidebarToggle')
        );

        this.activity = new ActivityComponent(
            document.getElementById('activityContainer')
        );

        // Initialize pages
        this.pages = {
            chat: new ChatPage(this.pageContainer, this.textInput, this.sendBtn),
            memory: new MemoryPage(this.pageContainer),
            tools: new ToolsPage(this.pageContainer)
        };

        this.currentPage = null;
    }

    async init() {
        console.log('[App] Initializing...');

        // Initialize sidebar
        this.sidebar.init();

        // Setup routing
        this._setupRouting();

        // Setup WebSocket handlers
        this._setupWebSocketHandlers();

        // Setup chat send handler
        this._setupChatHandlers();

        // Initialize router (will trigger initial route)
        router.init();

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

    _setupRouting() {
        // Register route handlers
        router.register('chat', () => this._switchPage('chat'));
        router.register('memory', () => this._switchPage('memory'));
        router.register('tools', () => this._switchPage('tools'));

        // Handle route changes for input visibility
        router.onChange((route) => {
            // Show input area only on chat page
            if (this.inputArea) {
                this.inputArea.style.display = route === 'chat' ? 'flex' : 'none';
            }
        });
    }

    _switchPage(pageName) {
        // Unmount current page
        if (this.currentPage && this.pages[this.currentPage]) {
            this.pages[this.currentPage].onHide();
            this.pages[this.currentPage].unmount();
        }

        // Mount new page
        if (this.pages[pageName]) {
            this.pages[pageName].mount();
            this.pages[pageName].onShow();
            this.currentPage = pageName;
        }

        console.log(`[App] Switched to ${pageName} page`);
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

        // Handle incoming messages - route to current page
        this.ws.onMessage((message) => {
            // Always route to chat page for messages
            if (this.pages.chat) {
                this.pages.chat.onMessage(message);
            }

            // Also notify current page if different
            if (this.currentPage !== 'chat' && this.pages[this.currentPage]) {
                this.pages[this.currentPage].onMessage(message);
            }

            // Handle errors
            if (message.type === 'error') {
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

            // Notify current page
            if (this.pages[this.currentPage]) {
                this.pages[this.currentPage].onActivity(event);
            }
        });
    }

    _setupChatHandlers() {
        this.pages.chat.onSend((content) => {
            // Send to server
            const sent = this.ws.sendChat(content);

            if (sent) {
                this.pages.chat.setWaiting(true);
            } else {
                this.pages.chat.addMessage('Unable to send message. Please check your connection.', 'ai');
            }
        });
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
