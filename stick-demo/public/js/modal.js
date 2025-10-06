// Glass Modal Utility for PracTrac App
// Replaces default browser alert() with beautiful glass-style modals

class GlassModal {
    constructor() {
        this.modalContainer = null;
        this.createModalContainer();
        this.addModalStyles();
    }

    createModalContainer() {
        // Remove existing modal if present
        const existingModal = document.getElementById('glass-modal-container');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal container
        this.modalContainer = document.createElement('div');
        this.modalContainer.id = 'glass-modal-container';
        this.modalContainer.className = 'glass-modal-overlay';
        document.body.appendChild(this.modalContainer);
    }

    addModalStyles() {
        // Check if styles already exist
        if (document.getElementById('glass-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'glass-modal-styles';
        style.textContent = `
            .glass-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                display: none;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .glass-modal-overlay.show {
                display: flex;
                opacity: 1;
            }

            .glass-modal {
                background: var(--glass-bg, rgba(255, 255, 255, 0.1));
                border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.2));
                border-radius: 0px;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 
                    0 8px 32px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s ease;
            }

            .glass-modal-overlay.show .glass-modal {
                transform: scale(1) translateY(0);
            }

            .glass-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .glass-modal-title {
                color: var(--text-primary, #ffffff);
                font-size: 1.25rem;
                font-weight: 600;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .glass-modal-close {
                background: none;
                border: none;
                color: var(--text-secondary, rgba(255, 255, 255, 0.7));
                font-size: 1.5rem;
                cursor: pointer;
                padding: 0.25rem;
                border-radius: 0px;
                transition: all 0.2s ease;
                width: 2rem;
                height: 2rem;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .glass-modal-close:hover {
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-primary, #ffffff);
            }

            .glass-modal-body {
                color: var(--text-secondary, rgba(255, 255, 255, 0.8));
                line-height: 1.6;
                margin-bottom: 1.5rem;
                white-space: pre-line;
            }

            .glass-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 0.75rem;
                padding-top: 1rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }

            .glass-modal-button {
                padding: 0.75rem 1.5rem;
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 0px;
                background: rgba(255, 255, 255, 0.1);
                color: var(--text-primary, #ffffff);
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }

            .glass-modal-button:hover {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.3);
                transform: translateY(-1px);
            }

            .glass-modal-button.primary {
                background: var(--accent-primary, #3b82f6);
                border-color: var(--accent-primary, #3b82f6);
                color: white;
            }

            .glass-modal-button.primary:hover {
                background: var(--accent-hover, #2563eb);
                border-color: var(--accent-hover, #2563eb);
            }

            .glass-modal-button.success {
                background: var(--success, #10b981);
                border-color: var(--success, #10b981);
                color: white;
            }

            .glass-modal-button.success:hover {
                background: var(--success-hover, #059669);
                border-color: var(--success-hover, #059669);
            }

            .glass-modal-button.warning {
                background: var(--warning, #f59e0b);
                border-color: var(--warning, #f59e0b);
                color: white;
            }

            .glass-modal-button.warning:hover {
                background: var(--warning-hover, #d97706);
                border-color: var(--warning-hover, #d97706);
            }

            .glass-modal-button.danger {
                background: var(--danger, #ef4444);
                border-color: var(--danger, #ef4444);
                color: white;
            }

            .glass-modal-button.danger:hover {
                background: var(--danger-hover, #dc2626);
                border-color: var(--danger-hover, #dc2626);
            }

            @media (max-width: 768px) {
                .glass-modal {
                    margin: 1rem;
                    padding: 1.5rem;
                }
                
                .glass-modal-footer {
                    flex-direction: column;
                }
                
                .glass-modal-button {
                    width: 100%;
                    justify-content: center;
                    display: flex;
                }
            }
        `;
        document.head.appendChild(style);
    }

    show(options = {}) {
        const {
            title = '📋 Notification',
            message = '',
            type = 'info',
            buttons = [{ text: 'OK', type: 'primary', action: () => this.hide() }],
            onShow = null,
            onHide = null
        } = options;

        // Get icon based on type
        const icons = {
            info: '📋',
            success: '✅',
            warning: '⚠️',
            error: '❌',
            question: '❓'
        };

        const icon = icons[type] || icons.info;

        // Create modal HTML
        this.modalContainer.innerHTML = `
            <div class="glass-modal">
                <div class="glass-modal-header">
                    <h3 class="glass-modal-title">${icon} ${title}</h3>
                    <button class="glass-modal-close" onclick="glassModal.hide()">×</button>
                </div>
                <div class="glass-modal-body">${message}</div>
                <div class="glass-modal-footer">
                    ${buttons.map((button, index) => 
                        `<button class="glass-modal-button ${button.type || 'default'}" onclick="glassModal.handleButtonClick(${index})">${button.text}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        // Store button actions for later
        this.buttonActions = buttons.map(button => button.action || (() => this.hide()));
        this.onHideCallback = onHide;

        // Show modal
        this.modalContainer.classList.add('show');

        // Focus management
        const firstButton = this.modalContainer.querySelector('.glass-modal-button');
        if (firstButton) {
            setTimeout(() => firstButton.focus(), 100);
        }

        // Handle escape key
        this.escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        };
        document.addEventListener('keydown', this.escapeHandler);

        // Handle backdrop click
        this.backdropHandler = (e) => {
            if (e.target === this.modalContainer) {
                this.hide();
            }
        };
        this.modalContainer.addEventListener('click', this.backdropHandler);

        if (onShow) onShow();

        return this;
    }

    hide() {
        this.modalContainer.classList.remove('show');
        
        // Clean up event listeners
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }
        
        if (this.backdropHandler) {
            this.modalContainer.removeEventListener('click', this.backdropHandler);
            this.backdropHandler = null;
        }

        // Call onHide callback
        if (this.onHideCallback) {
            this.onHideCallback();
            this.onHideCallback = null;
        }

        return this;
    }

    handleButtonClick(index) {
        if (this.buttonActions && this.buttonActions[index]) {
            this.buttonActions[index]();
        }
    }

    // Convenience methods that replace common alert patterns
    alert(message, title = 'Notification') {
        return this.show({
            title,
            message,
            type: 'info',
            buttons: [{ text: 'OK', type: 'primary' }]
        });
    }

    success(message, title = 'Success') {
        return this.show({
            title,
            message,
            type: 'success',
            buttons: [{ text: 'OK', type: 'success' }]
        });
    }

    error(message, title = 'Error') {
        return this.show({
            title,
            message,
            type: 'error',
            buttons: [{ text: 'OK', type: 'danger' }]
        });
    }

    warning(message, title = 'Warning') {
        return this.show({
            title,
            message,
            type: 'warning',
            buttons: [{ text: 'OK', type: 'warning' }]
        });
    }

    confirm(message, title = 'Confirm Action') {
        return new Promise((resolve) => {
            this.show({
                title,
                message,
                type: 'question',
                buttons: [
                    { text: 'Cancel', type: 'default', action: () => { this.hide(); resolve(false); } },
                    { text: 'Confirm', type: 'primary', action: () => { this.hide(); resolve(true); } }
                ]
            });
        });
    }
}

// Create global instance
const glassModal = new GlassModal();

// Override default alert for convenience (optional)
window.showGlassAlert = (message, title) => glassModal.alert(message, title);
window.showGlassSuccess = (message, title) => glassModal.success(message, title);
window.showGlassError = (message, title) => glassModal.error(message, title);
window.showGlassWarning = (message, title) => glassModal.warning(message, title);
window.showGlassConfirm = (message, title) => glassModal.confirm(message, title);