/**
 * Sidebar Component
 * Handles left sidebar navigation and toggling
 */

import { router } from '../core/router.js';

export class SidebarComponent {
    constructor(leftSidebar, leftToggle) {
        this.leftSidebar = leftSidebar;
        this.leftToggle = leftToggle;
        this.isLeftOpen = true;
    }

    init() {
        // Left sidebar toggle
        this.leftToggle.addEventListener('click', () => {
            this.toggleLeft();
        });

        // Navigation items - use router for navigation
        const navItems = this.leftSidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if (view) {
                    router.navigate(view);
                }
            });
        });

        // Listen to router changes to update active nav
        router.onChange((newRoute) => {
            this._updateActiveNav(newRoute);
        });

        // Auto-collapse on mobile
        if (window.innerWidth < 768) {
            this.isLeftOpen = false;
            this.leftSidebar.classList.add('collapsed');
        }

        // Handle resize
        window.addEventListener('resize', () => {
            if (window.innerWidth < 768 && this.isLeftOpen) {
                this.toggleLeft();
            }
        });

        // Set initial active nav based on current route
        const currentRoute = router.getCurrentRoute() || 'chat';
        this._updateActiveNav(currentRoute);
    }

    toggleLeft() {
        this.isLeftOpen = !this.isLeftOpen;
        this.leftSidebar.classList.toggle('collapsed', !this.isLeftOpen);
    }

    _updateActiveNav(route) {
        const navItems = this.leftSidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const view = item.dataset.view;
            item.classList.toggle('active', view === route);
        });
    }

    updateStatus(status, text) {
        const indicator = this.leftSidebar.querySelector('.status-indicator');
        const dot = indicator?.querySelector('.status-dot');
        const statusText = indicator?.querySelector('.status-text');

        if (dot) {
            dot.classList.remove('connected', 'error');
            if (status === 'connected') {
                dot.classList.add('connected');
            } else if (status === 'error' || status === 'failed') {
                dot.classList.add('error');
            }
        }

        if (statusText && text) {
            statusText.textContent = text;
        }
    }
}
