/**
 * Sidebar Module
 * Handles left and right sidebar navigation and toggling
 */

export class SidebarModule {
    constructor(leftSidebar, rightSidebar, leftToggle, rightToggle) {
        this.leftSidebar = leftSidebar;
        this.rightSidebar = rightSidebar;
        this.leftToggle = leftToggle;
        this.rightToggle = rightToggle;
        this.isLeftOpen = true;
        this.isRightOpen = false;
        this.viewChangeCallback = null;
    }

    init() {
        // Left sidebar toggle
        this.leftToggle.addEventListener('click', () => {
            this.toggleLeft();
        });

        // Right sidebar toggle
        this.rightToggle.addEventListener('click', () => {
            this.toggleRight();
        });

        // Navigation items
        const navItems = this.leftSidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const view = item.dataset.view;
                if (view) {
                    this._setActiveNav(item);
                    this._notifyViewChange(view);
                }
            });
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
    }

    toggleLeft() {
        this.isLeftOpen = !this.isLeftOpen;
        this.leftSidebar.classList.toggle('collapsed', !this.isLeftOpen);
    }

    toggleRight() {
        this.isRightOpen = !this.isRightOpen;
        this.rightSidebar.classList.toggle('open', this.isRightOpen);
        document.body.classList.toggle('right-panel-open', this.isRightOpen);
    }

    openRight() {
        if (!this.isRightOpen) {
            this.toggleRight();
        }
    }

    closeRight() {
        if (this.isRightOpen) {
            this.toggleRight();
        }
    }

    _setActiveNav(activeItem) {
        const navItems = this.leftSidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        activeItem.classList.add('active');
    }

    _notifyViewChange(view) {
        if (this.viewChangeCallback) {
            this.viewChangeCallback(view);
        }
    }

    onViewChange(callback) {
        this.viewChangeCallback = callback;
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
