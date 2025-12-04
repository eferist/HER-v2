/**
 * Tools Page
 * Displays MCP servers in a grid layout
 */

import { BasePage } from './BasePage.js';
import { api } from '../services/api.js';

export class ToolsPage extends BasePage {
    constructor(container) {
        super(container);
        this.servers = [];
        this.isLoading = false;
    }

    // Icon SVG paths for each server type
    static ICONS = {
        'brave-search': 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
        'filesystem': 'M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z',
        'weather': 'M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z',
        'telegram': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z',
        'default': 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z'
    };

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
                <div class="tools-grid" id="toolsGrid">
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
        const grid = this.container.querySelector('#toolsGrid');
        if (!grid) return;

        if (this.servers.length === 0) {
            this._renderEmpty('No MCP servers configured');
            return;
        }

        grid.innerHTML = this.servers.map(server => this._renderCard(server)).join('');
    }

    _renderCard(server) {
        const iconPath = ToolsPage.ICONS[server.name] || ToolsPage.ICONS.default;

        // Determine status
        let statusClass = 'disabled';
        let statusText = 'Disabled';

        if (server.enabled) {
            if (server.connected) {
                statusClass = 'connected';
                statusText = 'Connected';
            } else {
                statusClass = 'error';
                statusText = 'Disconnected';
            }
        }

        return `
            <div class="tool-card">
                <div class="tool-card-header">
                    <div class="tool-card-icon">
                        <svg class="icon" viewBox="0 0 24 24"><path d="${iconPath}"/></svg>
                    </div>
                    <div class="tool-card-status ${statusClass}">
                        <span class="status-dot"></span>
                        <span class="status-label">${statusText}</span>
                    </div>
                </div>
                <div class="tool-card-body">
                    <div class="tool-card-name">${this.escapeHtml(server.name)}</div>
                    <div class="tool-card-desc">${this.escapeHtml(server.description || 'No description')}</div>
                </div>
                <div class="tool-card-footer">
                    <div class="tool-card-badge">
                        <span class="badge-count">${server.tool_count}</span>
                        <span class="badge-label">tools</span>
                    </div>
                </div>
            </div>
        `;
    }

    _renderLoading() {
        const grid = this.container.querySelector('#toolsGrid');
        if (!grid) return;

        // Render skeleton cards
        grid.innerHTML = Array(4).fill('').map(() => `
            <div class="tool-card skeleton">
                <div class="tool-card-header">
                    <div class="tool-card-icon skeleton-icon"></div>
                    <div class="skeleton-status"></div>
                </div>
                <div class="tool-card-body">
                    <div class="skeleton-text skeleton-title"></div>
                    <div class="skeleton-text skeleton-desc"></div>
                </div>
                <div class="tool-card-footer">
                    <div class="skeleton-badge"></div>
                </div>
            </div>
        `).join('');
    }

    _renderEmpty(message = 'No servers found') {
        const grid = this.container.querySelector('#toolsGrid');
        if (!grid) return;

        grid.innerHTML = `
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
