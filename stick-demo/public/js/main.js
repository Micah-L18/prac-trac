// PracTrac Main JavaScript - Interactive Demo Functionality

class PracTracDemo {
    constructor() {
        this.isTimerRunning = false;
        this.timerInterval = null;
        this.currentTime = 0;
        this.currentUser = null;
        this.init();
    }

    init() {
        // Check authentication status
        this.checkAuthStatus();
        // Initialize any page-specific functionality
        this.setupEventListeners();
        this.animateOnLoad();
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/user');
            if (response.ok) {
                const data = await response.json();
                this.currentUser = data.user;
                this.updateUIForLoggedInUser();
            } else {
                this.currentUser = null;
                this.updateUIForLoggedOutUser();
            }
        } catch (error) {
            // User not authenticated or network error
            this.currentUser = null;
            this.updateUIForLoggedOutUser();
        }
    }

    updateUIForLoggedInUser() {
        // Update any user-specific UI elements
        const userMenus = document.querySelectorAll('.user-menu');
        const userGreetings = document.querySelectorAll('#userGreeting');
        
        userGreetings.forEach(greeting => {
            if (greeting) {
                greeting.textContent = `Hello, ${this.currentUser.username}`;
            }
        });

        // Show logout buttons, hide login/register links
        const loginLinks = document.querySelectorAll('.login-link');
        const logoutBtns = document.querySelectorAll('.logout-btn');
        
        loginLinks.forEach(link => link.style.display = 'none');
        logoutBtns.forEach(btn => {
            btn.style.display = 'block';
            btn.onclick = () => this.logout();
        });

        // Update navigation for authenticated users
        this.updateNavigationForAuthenticated();
        
        // Initialize team selector
        this.initializeTeamSelector();
    }

    updateUIForLoggedOutUser() {
        // Show login/register links, hide user-specific elements
        const loginLinks = document.querySelectorAll('.login-link');
        const logoutButtons = document.querySelectorAll('.logout-btn');
        const userGreetings = document.querySelectorAll('#userGreeting');
        
        loginLinks.forEach(link => link.style.display = 'inline-block');
        logoutButtons.forEach(button => button.style.display = 'none');
        userGreetings.forEach(greeting => {
            if (greeting) {
                greeting.textContent = 'Guest User';
            }
        });

        // Restrict navigation for non-authenticated users
        this.updateNavigationForGuest();
        this.checkPageAccess();
    }

    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Force logout
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    }

    updateNavigationForAuthenticated() {
        // Show all navigation links for authenticated users
        const navLinks = document.querySelectorAll('.nav-links li');
        navLinks.forEach(link => {
            link.style.display = 'list-item';
        });
    }

    updateNavigationForGuest() {
        // Only show Dashboard for guests, hide all other nav items
        const navLinks = document.querySelectorAll('.nav-links li');
        navLinks.forEach(link => {
            const anchor = link.querySelector('a');
            if (anchor) {
                const href = anchor.getAttribute('href');
                // Only show dashboard for guests
                if (href === 'index.html') {
                    link.style.display = 'list-item';
                } else {
                    link.style.display = 'none';
                }
            }
        });
    }

    checkPageAccess() {
        // Get current page
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop() || 'index.html';
        
        // Define allowed pages for guests
        const allowedPages = ['index.html', 'login.html', 'register.html', 'settings.html', ''];
        
        // If user is not logged in and trying to access restricted page
        if (!this.currentUser && !allowedPages.includes(currentPage)) {
            // Redirect to login page
            window.location.href = 'login.html';
        }
    }

    setupEventListeners() {
        // Handle navigation active states
        this.updateActiveNavigation();
        
        // Add hover effects to glass cards
        this.addGlassEffects();
        
        // Setup any form interactions
        this.setupFormInteractions();
    }

    updateActiveNavigation() {
        const currentPage = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-links a');
        
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPage || 
                (currentPage === '/' && link.getAttribute('href') === '/')) {
                link.classList.add('active');
            }
        });
    }

    addGlassEffects() {
        const glassCards = document.querySelectorAll('.glass-card, .feature-card, .player-card, .drill-card, .video-card');
        
        glassCards.forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 107, 53, 0.1)';
            });
            
            card.addEventListener('mouseleave', (e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '';
            });
        });
    }

    setupFormInteractions() {
        const inputs = document.querySelectorAll('.glass-input');
        
        inputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                e.target.style.borderColor = 'var(--accent-orange)';
                e.target.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
            });
            
            input.addEventListener('blur', (e) => {
                e.target.style.borderColor = 'var(--glass-border)';
                e.target.style.boxShadow = '';
            });
        });
    }

    animateOnLoad() {
        // Animate elements with fade-in-up class
        const animatedElements = document.querySelectorAll('.fade-in-up');
        
        animatedElements.forEach((element, index) => {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    // Utility function to show notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--glass-primary);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-lg);
            padding: var(--spacing-md) var(--spacing-lg);
            color: var(--text-primary);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;
        
        if (type === 'success') {
            notification.style.borderColor = 'var(--accent-green)';
        } else if (type === 'error') {
            notification.style.borderColor = 'var(--accent-red)';
        } else if (type === 'warning') {
            notification.style.borderColor = 'var(--accent-amber)';
        }
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
                <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Practice Timer Functions
    startPracticeTimer(duration = 2700) { // 45 minutes default
        this.currentTime = duration;
        this.isTimerRunning = true;
        
        this.timerInterval = setInterval(() => {
            if (this.isTimerRunning && this.currentTime > 0) {
                this.currentTime--;
                this.updateTimerDisplay();
                
                if (this.currentTime === 0) {
                    this.onTimerComplete();
                }
            }
        }, 1000);
    }

    pausePracticeTimer() {
        this.isTimerRunning = !this.isTimerRunning;
        return this.isTimerRunning;
    }

    stopPracticeTimer() {
        this.isTimerRunning = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById('practiceTimer');
        if (timerElement) {
            const minutes = Math.floor(this.currentTime / 60);
            const seconds = this.currentTime % 60;
            timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    onTimerComplete() {
        this.showNotification('Practice phase complete!', 'success');
        this.stopPracticeTimer();
        
        // Play completion sound (if audio is available)
        this.playCompletionSound();
    }

    playCompletionSound() {
        // Create a simple beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    // Data Management Functions
    async fetchData(endpoint) {
        try {
            const response = await fetch(`/api/${endpoint}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            this.showNotification(`Error loading ${endpoint} data`, 'error');
            return [];
        }
    }

    // Local Storage Management
    saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(`practrac_${key}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    }

    loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(`practrac_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    }

    // Utility Functions
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Demo-specific functions
    simulateDataSync() {
        this.showNotification('Syncing data to cloud...', 'info');
        
        setTimeout(() => {
            this.showNotification('Data synced successfully!', 'success');
        }, 2000);
    }

    generateDemoReport() {
        this.showNotification('Generating practice report...', 'info');
        
        setTimeout(() => {
            this.showNotification('Report generated and ready for download!', 'success');
        }, 1500);
    }

    // Team Management Functions
    async loadUserTeams() {
        try {
            const response = await fetch('/api/teams');
            if (response.ok) {
                const teams = await response.json();
                return teams;
            } else {
                console.error('Error loading teams:', response.statusText);
                return [];
            }
        } catch (error) {
            console.error('Error loading teams:', error);
            return [];
        }
    }

    async getCurrentTeam() {
        try {
            const response = await fetch('/api/user/current-team');
            if (response.ok) {
                const data = await response.json();
                return data.currentTeam;
            } else {
                console.error('Error loading current team:', response.statusText);
                return null;
            }
        } catch (error) {
            console.error('Error loading current team:', error);
            return null;
        }
    }

    async switchTeam(teamId) {
        try {
            const response = await fetch('/api/user/current-team', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ teamId })
            });

            if (response.ok) {
                this.showNotification('Team switched successfully!', 'success');
                // Reload the page to refresh all data with new team context
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                const data = await response.json();
                this.showNotification(`Error switching team: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Error switching team:', error);
            this.showNotification('Error switching team', 'error');
        }
    }

    async createTeam(teamData) {
        try {
            const response = await fetch('/api/teams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(teamData)
            });

            if (response.ok) {
                const team = await response.json();
                this.showNotification('Team created successfully!', 'success');
                return team;
            } else {
                const data = await response.json();
                this.showNotification(`Error creating team: ${data.error}`, 'error');
                return null;
            }
        } catch (error) {
            console.error('Error creating team:', error);
            this.showNotification('Error creating team', 'error');
            return null;
        }
    }

    async updateTeam(teamId, teamData) {
        try {
            const response = await fetch(`/api/teams/${teamId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(teamData)
            });

            if (response.ok) {
                const team = await response.json();
                this.showNotification('Team updated successfully!', 'success');
                return team;
            } else {
                const data = await response.json();
                this.showNotification(`Error updating team: ${data.error}`, 'error');
                return null;
            }
        } catch (error) {
            console.error('Error updating team:', error);
            this.showNotification('Error updating team', 'error');
            return null;
        }
    }

    async deleteTeam(teamId) {
        try {
            const response = await fetch(`/api/teams/${teamId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('Team deleted successfully!', 'success');
                return true;
            } else {
                const data = await response.json();
                this.showNotification(`Error deleting team: ${data.error}`, 'error');
                return false;
            }
        } catch (error) {
            console.error('Error deleting team:', error);
            this.showNotification('Error deleting team', 'error');
            return false;
        }
    }

    async initializeTeamSelector() {
        if (!this.currentUser) return;

        const teams = await this.loadUserTeams();
        const currentTeam = await this.getCurrentTeam();
        
        this.renderTeamSelector(teams, currentTeam);
    }

    renderTeamSelector(teams, currentTeam) {
        // This will be called to render the team selector in the navigation
        // We'll implement this when we add the UI components
        const teamSelectorContainer = document.getElementById('teamSelector');
        if (!teamSelectorContainer) return;

        if (teams.length === 0) {
            teamSelectorContainer.innerHTML = `
                <div class="no-teams">
                    <span>No teams</span>
                    <button onclick="window.pracTracDemo.showCreateTeamModal()" class="glass-button">Create Team</button>
                </div>
            `;
            return;
        }

        const currentTeamName = currentTeam ? currentTeam.name : 'Select Team';
        
        teamSelectorContainer.innerHTML = `
            <div class="team-selector">
                <button class="team-selector-btn glass-button" onclick="window.pracTracDemo.toggleTeamDropdown()">
                    🏐 ${currentTeamName} ▼
                </button>
                <div class="team-dropdown" id="teamDropdown" style="display: none;">
                    ${teams.map(team => `
                        <div class="team-option ${team.id === (currentTeam?.id) ? 'active' : ''}" 
                             onclick="window.pracTracDemo.switchTeam(${team.id})">
                            ${team.name} - ${team.season}
                        </div>
                    `).join('')}
                    <div class="team-option create-new" onclick="window.pracTracDemo.showCreateTeamModal()">
                        ➕ Create New Team
                    </div>
                </div>
            </div>
        `;
    }

    toggleTeamDropdown() {
        const dropdown = document.getElementById('teamDropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
    }

    showCreateTeamModal() {
        // This will be implemented when we create the team management page
        console.log('Create team modal - to be implemented');
    }
}

// Initialize the demo when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.pracTracDemo = new PracTracDemo();
});

// Global utility functions for demo interactions
function showDemoFeature(featureName) {
    window.pracTracDemo.showNotification(`${featureName} - Feature coming in full version!`, 'info');
}

function simulateUpload() {
    window.pracTracDemo.showNotification('File upload simulation - Upload progress: 100%', 'success');
}

function simulateVideoRecording() {
    window.pracTracDemo.showNotification('Video recording started - Demo mode', 'info');
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PracTracDemo;
}