/**
 * Tools Page
 * Displays MCP servers in a grid layout with configuration capabilities
 */

import { BasePage } from './BasePage.js';
import { api } from '../services/api.js';
import { configModal } from '../components/ConfigModal.js';

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
        'google-workspace': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
        'todoist': 'M22 5.18L10.59 16.6l-4.24-4.24 1.41-1.41 2.83 2.83 10-10L22 5.18zM12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8c1.57 0 3.04.46 4.28 1.25l1.45-1.45C14.24 2.67 12.68 2 11 2 5.48 2 1 6.48 1 12s4.48 10 10 10c1.68 0 3.24-.67 4.73-1.8l-1.45-1.45C13.04 19.54 11.57 20 10 20z',
        'notion': 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2zm0 4h5v2H8v-2z',
        'slack': 'M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z',
        'memory': 'M15 9H9v6h6V9zm-2 4h-2v-2h2v2zm8-2V9h-2V7c0-1.1-.9-2-2-2h-2V3h-2v2h-2V3H9v2H7c-1.1 0-2 .9-2 2v2H3v2h2v2H3v2h2v2c0 1.1.9 2 2 2h2v2h2v-2h2v2h2v-2h2c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2zm-4 6H7V7h10v10z',
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

        // Attach click handlers for configure buttons
        grid.querySelectorAll('.tool-card-configure').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.tool-card');
                const serverName = card.dataset.server;
                const server = this.servers.find(s => s.name === serverName);
                if (server) {
                    this._openConfigModal(server);
                }
            });
        });
    }

    _renderCard(server) {
        const iconPath = ToolsPage.ICONS[server.name] || ToolsPage.ICONS.default;
        const hasMissing = server.missing_vars && server.missing_vars.length > 0;

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
        } else if (hasMissing) {
            statusClass = 'needs-setup';
            statusText = 'Needs Setup';
        }

        return `
            <div class="tool-card" data-server="${this.escapeHtml(server.name)}">
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
                    <div class="tool-card-name">${this.escapeHtml(server.display_name || server.name)}</div>
                    <div class="tool-card-desc">${this.escapeHtml(server.description || 'No description')}</div>
                    ${hasMissing ? `
                        <div class="tool-card-missing">
                            Missing: ${server.missing_vars.map(v => `<code>${this.escapeHtml(v)}</code>`).join(', ')}
                        </div>
                    ` : ''}
                </div>
                <div class="tool-card-footer">
                    <div class="tool-card-badge">
                        <span class="badge-count">${server.tool_count}</span>
                        <span class="badge-label">tools</span>
                    </div>
                    <button class="tool-card-configure" title="Configure">
                        <svg viewBox="0 0 24 24" width="18" height="18">
                            <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    _openConfigModal(server) {
        configModal.show(server, async (result) => {
            // Reload servers after configuration
            await this._loadServers();

            // Trigger MCP reload if server was enabled
            if (result.enabled) {
                try {
                    await api.reloadMcp();
                    // Reload again to show updated connection status
                    setTimeout(() => this._loadServers(), 1000);
                } catch (error) {
                    console.error('Failed to reload MCP:', error);
                }
            }
        });
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
