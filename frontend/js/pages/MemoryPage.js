/**
 * Memory Page
 * Displays and manages long-term memory
 */

import { BasePage } from './BasePage.js';
import { api } from '../services/api.js';

export class MemoryPage extends BasePage {
    constructor(container) {
        super(container);
        this.memories = [];
        this.searchQuery = '';
        this.isLoading = false;
    }

    mount() {
        super.mount();
        this._render();
        this._loadMemories();
    }

    unmount() {
        super.unmount();
    }

    _render() {
        this.container.innerHTML = `
            <div class="memory-page">
                <div class="memory-header">
                    <input
                        type="text"
                        class="memory-search"
                        placeholder="Search memories..."
                        id="memorySearch"
                    >
                </div>
                <div class="memory-grid" id="memoryGrid">
                    <!-- Memory cards will be inserted here -->
                </div>
            </div>
        `;

        // Setup search handler
        const searchInput = this.container.querySelector('#memorySearch');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this._handleSearch();
        });
    }

    async _loadMemories() {
        this.isLoading = true;
        this._renderLoading();

        try {
            const response = await api.getMemories();
            this.memories = response.memories || [];
            this._renderMemories();
        } catch (error) {
            console.error('[MemoryPage] Failed to load memories:', error);
            this._renderEmpty('Failed to load memories');
        } finally {
            this.isLoading = false;
        }
    }

    async _handleSearch() {
        if (!this.searchQuery.trim()) {
            this._renderMemories();
            return;
        }

        this.isLoading = true;

        try {
            const response = await api.searchMemories(this.searchQuery);
            this.memories = response.memories || [];
            this._renderMemories();
        } catch (error) {
            console.error('[MemoryPage] Search failed:', error);
        } finally {
            this.isLoading = false;
        }
    }

    _renderMemories() {
        const grid = this.container.querySelector('#memoryGrid');
        if (!grid) return;

        if (this.memories.length === 0) {
            this._renderEmpty('No memories found');
            return;
        }

        grid.innerHTML = this.memories.map(memory => `
            <div class="memory-card" data-id="${memory.id || ''}">
                <div class="memory-card-title">${this.escapeHtml(memory.title || 'Memory')}</div>
                <div class="memory-card-content">${this.escapeHtml(memory.content || '')}</div>
                <div class="memory-card-meta">${this._formatDate(memory.created_at)}</div>
            </div>
        `).join('');
    }

    _renderLoading() {
        const grid = this.container.querySelector('#memoryGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="memory-empty">
                <svg class="icon" viewBox="0 0 24 24"><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/></svg>
                <p>Loading memories...</p>
            </div>
        `;
    }

    _renderEmpty(message = 'No memories yet') {
        const grid = this.container.querySelector('#memoryGrid');
        if (!grid) return;

        grid.innerHTML = `
            <div class="memory-empty">
                <svg class="icon" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    _formatDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString();
        } catch {
            return '';
        }
    }

    onShow() {
        // Refresh memories when page becomes visible
        if (this.mounted) {
            this._loadMemories();
        }
    }
}
