class PracTracSPA {
    constructor() {
        this.currentPage = 'dashboard';
        this.pages = {
            'dashboard': {
                title: 'Dashboard',
                content: this.getDashboardContent,
                init: this.initDashboard
            },
            'practice': {
                title: 'Practice Planning',
                content: this.getPracticeContent,
                init: this.initPractice
            },
            'past-practices': {
                title: 'Past Practices',
                content: this.getPastPracticesContent,
                init: this.initPastPractices
            },
            'roster': {
                title: 'Team Roster',
                content: this.getRosterContent,
                init: this.initRoster
            },
            'drills': {
                title: 'Drill Library',
                content: this.getDrillsContent,
                init: this.initDrills
            },
            'settings': {
                title: 'Settings',
                content: this.getSettingsContent,
                init: this.initSettings
            }
        };
        
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupMobileMenu();
        this.handleInitialRoute();
    }

    setupNavigation() {
        // Handle navigation clicks
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                this.navigateTo(page);
                
                // Close mobile menu when navigation item is clicked
                this.closeMobileMenu();
            });
        });

        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.loadPage(e.state.page, false);
            }
        });
    }

    setupMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const navLinks = document.getElementById('navLinks');
        
        if (mobileMenuToggle && navLinks) {
            mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
            
            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!mobileMenuToggle.contains(e.target) && !navLinks.contains(e.target)) {
                    this.closeMobileMenu();
                }
            });
            
            // Close mobile menu on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeMobileMenu();
                }
            });
        }
    }

    toggleMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const navLinks = document.getElementById('navLinks');
        
        if (mobileMenuToggle && navLinks) {
            mobileMenuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        }
    }

    closeMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const navLinks = document.getElementById('navLinks');
        
        if (mobileMenuToggle && navLinks) {
            mobileMenuToggle.classList.remove('active');
            navLinks.classList.remove('active');
        }
    }

    handleInitialRoute() {
        // Check if there's a hash in the URL
        const hash = window.location.hash.substr(1);
        const initialPage = hash && this.pages[hash] ? hash : 'dashboard';
        this.navigateTo(initialPage, false);
    }

    navigateTo(page, updateHistory = true) {
        if (!this.pages[page]) {
            console.error(`Page "${page}" not found`);
            return;
        }

        if (updateHistory) {
            history.pushState({ page }, '', `#${page}`);
        }

        this.loadPage(page);
    }

    async loadPage(page, updateHistory = true) {
        this.currentPage = page;
        
        // Update navigation active state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === page) {
                link.classList.add('active');
            }
        });

        // Update page title
        document.title = `PracTrac - ${this.pages[page].title}`;

        // Show loading state
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = '<div class="loading">Loading...</div>';

        try {
            // Get page content
            const content = await this.pages[page].content.call(this);
            
            // Update main content
            mainContent.innerHTML = content;

            // Initialize page-specific functionality
            if (this.pages[page].init) {
                await this.pages[page].init.call(this);
            }

        } catch (error) {
            console.error(`Error loading page ${page}:`, error);
            mainContent.innerHTML = '<div class="error">Error loading page. Please try again.</div>';
        }
    }

    // Page Content Methods
    async getDashboardContent() {
        return `
            <div class="container">
                <div class="hero-section">
                    <h1>🏐 PracTrac Dashboard</h1>
                    <p>Welcome to your volleyball practice management platform</p>
                </div>
                
                <div class="dashboard-grid">
                    <div class="dashboard-card" onclick="window.pracTracSPA.navigateTo('practice')">
                        <h3>📋 Plan Practice</h3>
                        <p>Create and manage practice sessions</p>
                    </div>
                    
                    <div class="dashboard-card" onclick="window.pracTracSPA.navigateTo('roster')">
                        <h3>👥 Team Roster</h3>
                        <p>Manage your team's players</p>
                    </div>
                    
                    <div class="dashboard-card" onclick="window.pracTracSPA.navigateTo('drills')">
                        <h3>🎯 Drill Library</h3>
                        <p>Browse and create drills</p>
                    </div>
                    
                    <div class="dashboard-card" onclick="window.pracTracSPA.navigateTo('past-practices')">
                        <h3>📊 Past Practices</h3>
                        <p>Review previous sessions</p>
                    </div>
                </div>
            </div>
        `;
    }

    async getPracticeContent() {
        // Load the practice page content from the existing practice.html
        const response = await fetch('practice.html');
        const html = await response.text();
        
        // Extract just the main content (everything between <main> tags)
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
        if (mainMatch) {
            return mainMatch[1];
        }
        
        // Fallback if no main tag found
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
        if (bodyMatch) {
            // Remove nav and script tags
            let content = bodyMatch[1];
            content = content.replace(/<nav[\s\S]*?<\/nav>/, '');
            content = content.replace(/<script[\s\S]*?<\/script>/g, '');
            return content;
        }
        
        return '<div class="error">Could not load practice content</div>';
    }

    async getPastPracticesContent() {
        const response = await fetch('past-practices.html');
        const html = await response.text();
        
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
        if (mainMatch) {
            return mainMatch[1];
        }
        
        return '<div class="error">Could not load past practices content</div>';
    }

    async getRosterContent() {
        const response = await fetch('roster.html');
        const html = await response.text();
        
        // Extract content after nav and before scripts
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
        if (bodyMatch) {
            let content = bodyMatch[1];
            content = content.replace(/<nav[\s\S]*?<\/nav>/, '');
            content = content.replace(/<script[\s\S]*?<\/script>/g, '');
            return content;
        }
        
        return '<div class="error">Could not load roster content</div>';
    }

    async getDrillsContent() {
        const response = await fetch('drills.html');
        const html = await response.text();
        
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
        if (bodyMatch) {
            let content = bodyMatch[1];
            content = content.replace(/<nav[\s\S]*?<\/nav>/, '');
            content = content.replace(/<script[\s\S]*?<\/script>/g, '');
            return content;
        }
        
        return '<div class="error">Could not load drills content</div>';
    }

    async getSettingsContent() {
        const response = await fetch('settings.html');
        const html = await response.text();
        
        const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
        if (bodyMatch) {
            let content = bodyMatch[1];
            content = content.replace(/<nav[\s\S]*?<\/nav>/, '');
            content = content.replace(/<script[\s\S]*?<\/script>/g, '');
            return content;
        }
        
        return '<div class="error">Could not load settings content</div>';
    }

    // Page Initialization Methods
    async initDashboard() {
        // Dashboard-specific initialization
        console.log('Dashboard initialized');
    }

    async initPractice() {
        // Re-initialize practice page functionality
        if (window.pracTracDemo) {
            await window.pracTracDemo.loadPractices();
            await window.pracTracDemo.loadDrills();
            await window.pracTracDemo.checkActiveSession();
        }
    }

    async initPastPractices() {
        // Re-initialize past practices functionality
        if (window.pracTracDemo) {
            await window.pracTracDemo.loadPracticeSessions();
        }
    }

    async initRoster() {
        // Re-initialize roster functionality
        if (window.pracTracDemo) {
            await window.pracTracDemo.loadPlayers();
            await window.pracTracDemo.loadTeamStats();
        }
    }

    async initDrills() {
        // Re-initialize drills functionality
        if (window.pracTracDemo) {
            await window.pracTracDemo.loadDrills();
        }
    }

    async initSettings() {
        // Re-initialize settings functionality
        if (window.loadUserInfo) {
            await window.loadUserInfo();
        }
    }
}