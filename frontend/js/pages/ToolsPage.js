/**
 * Tools Page
 * Displays MCP servers and their tools
 */

import { BasePage } from './BasePage.js';
import { api } from '../services/api.js';

export class ToolsPage extends BasePage {
    constructor(container) {
        super(container);
        this.servers = [];
        this.isLoading = false;
        this.expandedServers = new Set();
    }

    mount() {
        super.mount();
        this._render();
        this._loadServers();
    }

    unmount() {
        super.unmount();
    }

    _render() {
        this.container.innerHTML = `
            <div class="tools-page">
                <div class="tools-header">
                    <div class="tools-title">MCP Servers</div>
                    <div class="tools-subtitle">Connected tool servers and their capabilities</div>
                </div>
                <div class="tools-list" id="toolsList">
                    <!-- Server cards will be inserted here -->
                </div>
            </div>
        `;
    }

    async _loadServers() {
        this.isLoading = true;
        this._renderLoading();

        try {
            const response = await api.getMcpServers();
            this.servers = response.servers || [];
            this._renderServers();
        } catch (error) {
            console.error('[ToolsPage] Failed to load servers:', error);
            this._renderEmpty('Failed to load MCP servers');
        } finally {
            this.isLoading = false;
        }
    }

    _renderServers() {
        const list = this.container.querySelector('#toolsList');
        if (!list) return;

        if (this.servers.length === 0) {
            this._renderEmpty('No MCP servers connected');
            return;
        }

        list.innerHTML = this.servers.map(server => this._renderServer(server)).join('');

        // Setup click handlers for expand/collapse
        list.querySelectorAll('.tool-server-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Don't toggle if clicking the toggle button
                if (e.target.closest('.tool-server-toggle')) return;

                const serverEl = header.closest('.tool-server');
                const serverName = serverEl.dataset.server;
                this._toggleServer(serverName, serverEl);
            });
        });
    }

    _renderServer(server) {
        const isExpanded = this.expandedServers.has(server.name);
        const statusClass = server.enabled ? '' : 'disabled';
        const tools = server.tools || [];

        return `
            <div class="tool-server ${isExpanded ? 'expanded' : ''}" data-server="${this.escapeHtml(server.name)}">
                <div class="tool-server-header">
                    <div class="tool-server-info">
                        <span class="tool-server-status ${statusClass}"></span>
                        <span class="tool-server-name">${this.escapeHtml(server.name)}</span>
                    </div>
                    <button class="tool-server-toggle" data-server="${this.escapeHtml(server.name)}">
                        ${server.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                </div>
                <div class="tool-server-tools">
                    ${tools.length > 0
                        ? tools.map(tool => `
                            <div class="tool-item">${this.escapeHtml(tool.name || tool)}</div>
                        `).join('')
                        : '<div class="tool-item">No tools available</div>'
                    }
                </div>
            </div>
        `;
    }

    _toggleServer(serverName, serverEl) {
        if (this.expandedServers.has(serverName)) {
            this.expandedServers.delete(serverName);
            serverEl.classList.remove('expanded');
        } else {
            this.expandedServers.add(serverName);
            serverEl.classList.add('expanded');
        }
    }

    _renderLoading() {
        const list = this.container.querySelector('#toolsList');
        if (!list) return;

        list.innerHTML = `
            <div class="tools-empty">
                <svg class="icon" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                <p>Loading servers...</p>
            </div>
        `;
    }

    _renderEmpty(message = 'No servers found') {
        const list = this.container.querySelector('#toolsList');
        if (!list) return;

        list.innerHTML = `
            <div class="tools-empty">
                <svg class="icon" viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    onShow() {
        // Refresh servers when page becomes visible
        if (this.mounted) {
            this._loadServers();
        }
    }
}
