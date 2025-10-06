# PracTrac Glass Demo

A stunning black glass UI demonstration of the PracTrac volleyball practice management application.

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   cd glass-demo
   npm install
   ```

2. **Start the Demo Server**
   ```bash
   npm start
   ```

3. **Open in Browser**
   Navigate to `http://localhost:3000` to view the demo

## 🏐 Demo Features

### Core Functionality Demonstrated
- **Dashboard**: Overview of team performance and quick stats
- **Practice Planning**: Timed practice phases with drill selection
- **Roster Management**: Player profiles with detailed statistics
- **Drill Library**: Searchable drill database with custom creation
- **Video Library**: Professional demonstrations with recording simulation
- **Analytics Dashboard**: Performance metrics and team insights

### Black Glass Design System
- **Glassmorphism Effects**: Backdrop blur and translucent containers
- **Volleyball-Inspired Colors**: Orange, blue, and accent color palette
- **Smooth Animations**: 60fps transitions and hover effects
- **Tablet-Optimized Layout**: Designed for iPad Pro landscape orientation
- **Interactive Elements**: Touch-friendly buttons and navigation

## 🎨 Design Features

### Visual Elements
- **Glass Cards**: Translucent containers with subtle borders
- **Gradient Overlays**: Multi-layered color gradients
- **Smooth Animations**: CSS transitions and keyframe animations
- **Responsive Grid**: Adaptive layouts for different screen sizes
- **Professional Typography**: Inter font family with proper hierarchy

### Interactive Components
- **Live Practice Timer**: Countdown timer with phase transitions
- **Filterable Data**: Search and filter functionality for drills/videos
- **Modal Interfaces**: Overlay dialogs for detailed views
- **Progressive Loading**: Smooth data loading animations
- **Notification System**: Toast notifications for user feedback

## 📱 Technology Stack

### Frontend
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Modern CSS with custom properties and flexbox/grid
- **Vanilla JavaScript**: No frameworks - pure ES6+ JavaScript
- **Glass Design System**: Custom CSS framework for glassmorphism

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **Static File Serving**: Efficient asset delivery
- **API Endpoints**: RESTful API for demo data

### Demo Data
- **Realistic Volleyball Data**: 6 players with authentic stats
- **Practice Templates**: Pre-built practice plans
- **Drill Library**: 4+ volleyball drills with descriptions
- **Video Demonstrations**: Simulated video library

## 🗂️ Project Structure

```
glass-demo/
├── public/                 # Static web assets
│   ├── css/
│   │   └── glass-style.css # Complete design system
│   ├── js/
│   │   └── main.js         # Interactive functionality
│   ├── index.html          # Dashboard homepage
│   ├── practice.html       # Practice planning interface
│   ├── roster.html         # Team roster management
│   ├── drills.html         # Drill library browser
│   ├── videos.html         # Video demonstration library
│   └── analytics.html      # Performance analytics dashboard
├── server.js               # Express server with API endpoints
├── package.json            # Node.js dependencies
└── README.md              # This documentation
```

## 🔧 Development

### Available Scripts
- `npm start`: Start production server
- `npm run dev`: Start development server with auto-reload (requires nodemon)

### API Endpoints
- `GET /api/teams`: Team information
- `GET /api/players`: Player roster data
- `GET /api/drills`: Drill library database
- `GET /api/practices`: Practice plan templates
- `GET /api/videos`: Video demonstration library
- `GET /api/players/:id`: Individual player details
- `GET /api/drills/:id`: Specific drill information

### Demo Interactions
- **Practice Timer**: Functional countdown with pause/resume
- **Data Filtering**: Live search and category filtering
- **Modal Dialogs**: Video player and form interfaces
- **Responsive Design**: Optimized for tablet and desktop viewing
- **Notification System**: User feedback for actions

## 🎯 Key Demo Highlights

### Practice Planning
- Drag-and-drop phase builder simulation
- Live practice timer with automatic transitions
- Template system for common practice structures
- Real-time duration calculations

### Player Management
- Interactive player cards with hover effects
- Detailed statistics breakdown per player
- Team overview metrics and comparisons
- Professional roster table with sorting

### Drill & Video Library
- Searchable database with category filtering
- Custom drill creation modal interface
- Video recording simulation with live preview
- Professional video player with controls

### Analytics Dashboard
- Performance trend visualizations
- Individual player progress tracking
- Practice efficiency analysis
- AI-powered insights simulation

## 🚀 Production Deployment

For production deployment, consider:

1. **Performance Optimization**
   - CSS/JS minification
   - Image optimization
   - CDN for static assets
   - Gzip compression

2. **Security Enhancements**
   - HTTPS enforcement
   - CSP headers
   - Rate limiting
   - Input sanitization

3. **Scalability**
   - Database integration
   - User authentication
   - Cloud storage for videos
   - Real-time collaboration features

## 📄 License

This demo is part of the PracTrac project development and is intended for demonstration purposes.

---

**Note**: This is a demonstration interface showcasing the design and user experience of the proposed PracTrac application. Interactive features simulate the planned functionality of the full iPad application.