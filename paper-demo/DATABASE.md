# PracTrac Database Schema

## Overview
This database supports volleyball practice management with multi-coach authentication and team-based data isolation.

## Core Principles
- **Multi-tenant**: Each coach can have multiple teams
- **Data Isolation**: Teams data is isolated between coaches
- **Authentication**: JWT-based authentication for coaches
- **Team Selection**: Coaches select active team for session management

## Tables

### Authentication & Users

#### `coaches`
Primary user table for coach authentication and profile management.

```sql
CREATE TABLE coaches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1
);
```

#### `coach_sessions`
Track active login sessions and tokens.

```sql
CREATE TABLE coach_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
  user_agent TEXT,
  ip_address TEXT,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE
);
```

### Team Management

#### `teams`
Teams created and managed by coaches.

```sql
CREATE TABLE teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  division TEXT,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE,
  UNIQUE(coach_id, name, season)
);
```

#### `coach_active_teams`
Track which team each coach is currently working with.

```sql
CREATE TABLE coach_active_teams (
  coach_id INTEGER PRIMARY KEY,
  team_id INTEGER NOT NULL,
  selected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
);
```

### Player Management

#### `players`
Players belong to specific teams.

```sql
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  jersey_number INTEGER NOT NULL,
  position TEXT NOT NULL,
  skill_level INTEGER NOT NULL CHECK(skill_level >= 1 AND skill_level <= 5),
  height TEXT,
  year TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  UNIQUE(team_id, jersey_number)
);
```

#### `player_stats`
Statistical tracking for players by season.

```sql
CREATE TABLE player_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  season TEXT NOT NULL,
  kills INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  aces INTEGER DEFAULT 0,
  digs INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
  UNIQUE(player_id, season)
);
```

### Practice Management

#### `drills`
Drill library - can be shared across teams for the same coach.

```sql
CREATE TABLE drills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration INTEGER NOT NULL,
  difficulty INTEGER NOT NULL CHECK(difficulty >= 1 AND difficulty <= 5),
  description TEXT,
  equipment TEXT, -- JSON array
  min_players INTEGER NOT NULL,
  max_players INTEGER NOT NULL,
  focus TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE
);
```

#### `practices`
Practice plans for specific teams.

```sql
CREATE TABLE practices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  duration INTEGER NOT NULL,
  objective TEXT,
  estimated_duration INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
);
```

#### `practice_phases`
Phases within practice plans.

```sql
CREATE TABLE practice_phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  practice_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  duration INTEGER NOT NULL,
  type TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  objective TEXT,
  FOREIGN KEY (practice_id) REFERENCES practices (id) ON DELETE CASCADE
);
```

#### `practice_phase_drills`
Drills assigned to practice phases.

```sql
CREATE TABLE practice_phase_drills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  phase_id INTEGER NOT NULL,
  drill_id INTEGER NOT NULL,
  FOREIGN KEY (phase_id) REFERENCES practice_phases (id) ON DELETE CASCADE,
  FOREIGN KEY (drill_id) REFERENCES drills (id) ON DELETE CASCADE
);
```

### Session Management

#### `practice_sessions`
Live practice session tracking.

```sql
CREATE TABLE practice_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  practice_id INTEGER NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled', 'paused')),
  actual_duration INTEGER,
  notes TEXT,
  timer_state TEXT, -- JSON string
  current_phase_id INTEGER,
  phase_elapsed_time INTEGER DEFAULT 0,
  total_elapsed_time INTEGER DEFAULT 0,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (practice_id) REFERENCES practices (id) ON DELETE CASCADE
);
```

#### `practice_attendance`
Track player attendance for sessions.

```sql
CREATE TABLE practice_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  attended BOOLEAN NOT NULL DEFAULT 1,
  late_minutes INTEGER DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (session_id) REFERENCES practice_sessions (id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
  UNIQUE(session_id, player_id)
);
```

#### `player_notes`
Coach notes for players during practice sessions.

```sql
CREATE TABLE player_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  notes TEXT NOT NULL,
  note_type TEXT DEFAULT 'practice' CHECK(note_type IN ('practice', 'player')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES practice_sessions (id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
);
```

### Video Management

#### `videos`
Training video library per coach.

```sql
CREATE TABLE videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coach_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  duration TEXT NOT NULL,
  thumbnail TEXT,
  description TEXT,
  video_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT 1,
  FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE
);
```

## Indexes

```sql
-- Authentication indexes
CREATE INDEX idx_coaches_email ON coaches(email);
CREATE INDEX idx_coaches_username ON coaches(username);
CREATE INDEX idx_coach_sessions_token ON coach_sessions(token_hash);
CREATE INDEX idx_coach_sessions_coach_id ON coach_sessions(coach_id);

-- Team indexes
CREATE INDEX idx_teams_coach_id ON teams(coach_id);
CREATE INDEX idx_players_team_id ON players(team_id);

-- Practice indexes
CREATE INDEX idx_practices_team_id ON practices(team_id);
CREATE INDEX idx_practice_sessions_practice_id ON practice_sessions(practice_id);
CREATE INDEX idx_practice_attendance_session_id ON practice_attendance(session_id);

-- Performance indexes
CREATE INDEX idx_player_notes_session_player ON player_notes(session_id, player_id);
CREATE INDEX idx_practice_phases_practice_id ON practice_phases(practice_id);
```

## Data Relationships

1. **Coach → Teams**: One coach can have multiple teams
2. **Team → Players**: One team has many players
3. **Coach → Drills**: One coach has many drills (shared across teams)
4. **Team → Practices**: One team has many practice plans
5. **Practice → Sessions**: One practice plan can have multiple sessions
6. **Session → Notes**: One session can have multiple player notes
7. **Coach ↔ Active Team**: Each coach has one currently selected team

## Security Considerations

- Passwords are hashed using bcrypt
- JWT tokens for stateless authentication
- Session tracking for token management
- Data isolation by coach_id and team_id
- Input validation on all user data
- Rate limiting on authentication endpoints