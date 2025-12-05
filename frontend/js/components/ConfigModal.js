/**
 * Configuration Modal Component
 * Modal dialog for configuring MCP server credentials
 */

import CONFIG from '../core/config.js';

export class ConfigModal {
    constructor() {
        this.modal = null;
        this.server = null;
        this.onSave = null;
    }

    /**
     * Show the configuration modal for a server
     */
    show(server, onSave) {
        this.server = server;
        this.onSave = onSave;
        this._render();
        this._attachEvents();
    }

    /**
     * Hide and destroy the modal
     */
    hide() {
        if (this.modal) {
            this.modal.classList.add('closing');
            setTimeout(() => {
                this.modal.remove();
                this.modal = null;
            }, 200);
        }
    }

    _render() {
        // Remove existing modal if any
        const existing = document.querySelector('.config-modal-overlay');
        if (existing) existing.remove();

        const hasOAuth = this.server.auth_type === 'oauth';
        const envVars = this.server.env_vars || [];

        this.modal = document.createElement('div');
        this.modal.className = 'config-modal-overlay';
        this.modal.innerHTML = `
            <div class="config-modal">
                <div class="config-modal-header">
                    <h2>Configure ${this._escapeHtml(this.server.display_name || this.server.name)}</h2>
                    <button class="config-modal-close" aria-label="Close">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>

                <div class="config-modal-body">
                    ${this.server.setup_note ? `
                        <div class="config-note">
                            <svg viewBox="0 0 24 24" width="16" height="16">
                                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                            </svg>
                            <span>${this._escapeHtml(this.server.setup_note)}</span>
                        </div>
                    ` : ''}

                    ${hasOAuth ? `
                        <div class="config-oauth-notice">
                            <svg viewBox="0 0 24 24" width="24" height="24">
                                <path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                            </svg>
                            <div>
                                <strong>OAuth Authentication</strong>
                                <p>This service uses OAuth. Enter your credentials below, then you'll need to authorize in a browser on first use.</p>
                            </div>
                        </div>
                    ` : ''}

                    <form class="config-form" id="configForm">
                        ${envVars.map(v => this._renderField(v)).join('')}

                        ${envVars.length === 0 ? `
                            <div class="config-no-vars">
                                <p>This server doesn't require any configuration.</p>
                            </div>
                        ` : ''}
                    </form>
                </div>

                <div class="config-modal-footer">
                    <button type="button" class="btn btn-secondary" id="configCancel">Cancel</button>
                    ${envVars.length > 0 ? `
                        <button type="submit" form="configForm" class="btn btn-primary" id="configSave">
                            <span class="btn-text">Save & Enable</span>
                            <span class="btn-loading" style="display:none;">
                                <svg class="spinner" viewBox="0 0 24 24" width="16" height="16">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="60" stroke-linecap="round"/>
                                </svg>
                                Saving...
                            </span>
                        </button>
                    ` : `
                        <button type="button" class="btn btn-primary" id="configEnable">Enable Server</button>
                    `}
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Trigger animation
        requestAnimationFrame(() => {
            this.modal.classList.add('visible');
        });

        // Focus first input
        const firstInput = this.modal.querySelector('input');
        if (firstInput) firstInput.focus();
    }

    _renderField(varConfig) {
        const isMissing = (this.server.missing_vars || []).includes(varConfig.name);
        const inputType = varConfig.type === 'password' ? 'password' : 'text';

        return `
            <div class="config-field ${isMissing ? 'missing' : ''}">
                <label for="field_${varConfig.name}">
                    ${this._escapeHtml(varConfig.label)}
                    ${varConfig.required ? '<span class="required">*</span>' : ''}
                    ${isMissing ? '<span class="missing-badge">Missing</span>' : ''}
                </label>
                <div class="config-input-wrapper">
                    <input
                        type="${inputType}"
                        id="field_${varConfig.name}"
                        name="${varConfig.name}"
                        placeholder="${varConfig.type === 'password' ? '••••••••••••' : ''}"
                        ${varConfig.required ? 'required' : ''}
                        autocomplete="off"
                    />
                    ${inputType === 'password' ? `
                        <button type="button" class="toggle-visibility" data-field="field_${varConfig.name}">
                            <svg class="icon-show" viewBox="0 0 24 24" width="18" height="18">
                                <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                            <svg class="icon-hide" viewBox="0 0 24 24" width="18" height="18" style="display:none;">
                                <path fill="currentColor" d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
                ${varConfig.help_text ? `
                    <div class="config-help">
                        ${varConfig.help_url ? `
                            <a href="${varConfig.help_url}" target="_blank" rel="noopener">
                                ${this._escapeHtml(varConfig.help_text)}
                                <svg viewBox="0 0 24 24" width="12" height="12">
                                    <path fill="currentColor" d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                                </svg>
                            </a>
                        ` : this._escapeHtml(varConfig.help_text)}
                    </div>
                ` : ''}
            </div>
        `;
    }

    _attachEvents() {
        // Close button
        this.modal.querySelector('.config-modal-close').addEventListener('click', () => this.hide());

        // Cancel button
        this.modal.querySelector('#configCancel').addEventListener('click', () => this.hide());

        // Click outside to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hide();
        });

        // Escape key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this.hide();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Toggle password visibility
        this.modal.querySelectorAll('.toggle-visibility').forEach(btn => {
            btn.addEventListener('click', () => {
                const fieldId = btn.dataset.field;
                const input = document.getElementById(fieldId);
                const showIcon = btn.querySelector('.icon-show');
                const hideIcon = btn.querySelector('.icon-hide');

                if (input.type === 'password') {
                    input.type = 'text';
                    showIcon.style.display = 'none';
                    hideIcon.style.display = 'block';
                } else {
                    input.type = 'password';
                    showIcon.style.display = 'block';
                    hideIcon.style.display = 'none';
                }
            });
        });

        // Form submit
        const form = this.modal.querySelector('#configForm');
        if (form) {
            form.addEventListener('submit', (e) => this._handleSubmit(e));
        }

        // Enable button (for servers with no config)
        const enableBtn = this.modal.querySelector('#configEnable');
        if (enableBtn) {
            enableBtn.addEventListener('click', () => this._handleEnable());
        }
    }

    async _handleSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const envVars = {};

        for (const [key, value] of formData.entries()) {
            if (value.trim()) {
                envVars[key] = value.trim();
            }
        }

        // Show loading state
        const saveBtn = this.modal.querySelector('#configSave');
        const btnText = saveBtn.querySelector('.btn-text');
        const btnLoading = saveBtn.querySelector('.btn-loading');
        saveBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'flex';

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/mcp/servers/${this.server.name}/configure`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ env_vars: envVars, enable: true })
            });

            const result = await response.json();

            if (result.success) {
                this.hide();
                if (this.onSave) this.onSave(result);
            } else {
                alert('Failed to save configuration: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to save config:', error);
            alert('Failed to save configuration. Please try again.');
        } finally {
            saveBtn.disabled = false;
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    async _handleEnable() {
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/mcp/servers/${this.server.name}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: true })
            });

            const result = await response.json();

            if (result.success) {
                this.hide();
                if (this.onSave) this.onSave(result);
            }
        } catch (error) {
            console.error('Failed to enable server:', error);
            alert('Failed to enable server. Please try again.');
        }
    }

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }
}

// Singleton instance
export const configModal = new ConfigModal();
