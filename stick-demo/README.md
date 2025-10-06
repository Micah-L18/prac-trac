# PracTrac Stick Demo

A volleyball practice management application with a modern stick-style interface, powered by SQLite database for persistent data storage.

## Features

- **SQLite Database**: Persistent data storage with relational database structure
- **Player Management**: Track players, positions, stats, and performance
- **Practice Planning**: Create and manage practice sessions with multiple phases
- **Drill Library**: Comprehensive collection of volleyball drills
- **Video Resources**: Training videos categorized by skill type
- **Team Analytics**: Player statistics and team performance tracking

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: SQLite with better-sqlite3
- **Frontend**: HTML5, CSS3, JavaScript
- **UI Theme**: Stick-style modern interface

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. Navigate to the stick-demo directory:
   ```bash
   cd stick-demo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize the SQLite database:
   ```bash
   npm run init-db
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## API Endpoints

### Players
- `GET /api/players` - Get all players
- `GET /api/players/:id` - Get player by ID
- `POST /api/players` - Create new player
- `PUT /api/players/:id` - Update player
- `DELETE /api/players/:id` - Delete player

### Teams
- `GET /api/teams` - Get all teams

### Drills
- `GET /api/drills` - Get all drills
- `GET /api/drills/:id` - Get drill by ID

### Practices
- `GET /api/practices` - Get all practices

### Videos
- `GET /api/videos` - Get all videos

### Health Check
- `GET /api/health` - Server and database status

## Database Schema

The application uses SQLite with the following main tables:

- **teams**: Team information
- **players**: Player details and attributes  
- **player_stats**: Player statistics
- **drills**: Practice drill definitions
- **practices**: Practice session plans
- **practice_phases**: Individual phases within practices
- **practice_phase_drills**: Junction table for drills in phases
- **videos**: Training video resources

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize/reset database with sample data

### Project Structure

```
stick-demo/
├── server.js              # Main server file
├── init-db.js            # Database initialization script
├── package.json          # Dependencies and scripts
├── practrac.db           # SQLite database (created after init)
└── public/               # Static files
    ├── index.html        # Dashboard
    ├── practice.html     # Practice planning
    ├── roster.html       # Player management
    ├── drills.html       # Drill library
    ├── videos.html       # Video resources
    ├── analytics.html    # Statistics
    ├── css/
    │   └── glass-style.css
    └── js/
        └── main.js
```

## Sample Data

The database initialization script creates an empty database structure ready for data entry. No sample data is included - you can add your own teams, players, drills, and practices through the application interface or API endpoints.

## Contributing

This is a demo application showcasing SQLite integration with a volleyball practice management system.

## License

MIT License - see LICENSE file for details.