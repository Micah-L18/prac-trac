# PracTrac API Documentation

## Overview
This API provides comprehensive volleyball practice management with multi-coach authentication and team-based data isolation.

## Authentication
All protected routes require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Error Responses
All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Authentication Endpoints

### Register Coach
```
POST /auth/register
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com", 
  "password": "securepassword123"
}
```

### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

### Get Current Coach
```
GET /auth/me
Authorization: Bearer <token>
```

## Team Management

### Get All Teams
```
GET /api/teams
Authorization: Bearer <token>
```

### Create Team
```
POST /api/teams
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Varsity Volleyball",
  "season": "Fall 2024",
  "division": "High School",
  "description": "Varsity team description"
}
```

### Get Team Details
```
GET /api/teams/:id
Authorization: Bearer <token>
```

### Update Team
```
PUT /api/teams/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Team Name",
  "season": "Spring 2024",
  "division": "College",
  "description": "Updated description"
}
```

### Delete Team
```
DELETE /api/teams/:id
Authorization: Bearer <token>
```

### Select Active Team
```
POST /api/teams/:id/select
Authorization: Bearer <token>
```

### Get Active Team
```
GET /api/teams/active
Authorization: Bearer <token>
```

## Player Management (Requires Active Team)

### Get All Players
```
GET /api/players
Authorization: Bearer <token>
```

### Create Player
```
POST /api/players
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "jersey_number": 15,
  "position": "Outside Hitter",
  "skill_level": 8,
  "grade": 11,
  "height": "5'8\"",
  "notes": "Strong attack, needs work on passing"
}
```

### Update Player
```
PUT /api/players/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "Jane",
  "last_name": "Smith",
  "jersey_number": 16,
  "position": "Middle Blocker",
  "skill_level": 9,
  "grade": 12,
  "height": "5'9\"",
  "notes": "Improved blocking technique"
}
```

### Delete Player
```
DELETE /api/players/:id
Authorization: Bearer <token>
```

### Get Player Attendance History
```
GET /api/players/:id/attendance
Authorization: Bearer <token>
```

## Drill Management

### Get All Drills
```
GET /api/drills
Authorization: Bearer <token>
```

### Create Drill
```
POST /api/drills
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Pepper Drill",
  "category": "Passing",
  "duration": 15,
  "description": "Basic passing and setting drill",
  "setup": "Players pair up across the net",
  "execution": "Pass, set, attack sequence",
  "equipment": ["volleyballs", "net"],
  "focus": ["passing", "setting", "timing"],
  "difficulty": 3,
  "min_players": 4,
  "max_players": 20
}
```

### Update Drill
```
PUT /api/drills/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Advanced Pepper Drill",
  "category": "Attacking",
  "duration": 20,
  "description": "Advanced passing and attacking drill",
  "setup": "Players pair up with varied distances",
  "execution": "Pass, set, attack with movement",
  "equipment": ["volleyballs", "net", "cones"],
  "focus": ["passing", "setting", "attacking", "movement"],
  "difficulty": 5,
  "min_players": 4,
  "max_players": 16
}
```

### Delete Drill
```
DELETE /api/drills/:id
Authorization: Bearer <token>
```

## Practice Management

### Get All Practices
```
GET /api/practices
Authorization: Bearer <token>
```

### Create Practice
```
POST /api/practices
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Pre-Game Practice",
  "date": "2024-01-15",
  "start_time": "15:30",
  "end_time": "17:30",
  "location": "Main Gym",
  "focus": "Game preparation and strategy",
  "phases": [
    {
      "name": "Warm-up",
      "duration": 15,
      "description": "Dynamic stretching and light movement",
      "drills": [1, 2]
    },
    {
      "name": "Skill Work",
      "duration": 45,
      "description": "Focused skill development",
      "drills": [3, 4, 5]
    },
    {
      "name": "Scrimmage",
      "duration": 60,
      "description": "Game simulation",
      "drills": [6]
    }
  ]
}
```

### Update Practice
```
PUT /api/practices/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Practice Name",
  "date": "2024-01-16",
  "start_time": "16:00",
  "end_time": "18:00",
  "location": "Auxiliary Gym",
  "focus": "Defensive strategies"
}
```

### Delete Practice
```
DELETE /api/practices/:id
Authorization: Bearer <token>
```

### Get Practice Details with Phases
```
GET /api/practices/:id/phases
Authorization: Bearer <token>
```

## Practice Session Management

### Start Practice Session
```
POST /api/practice-sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "practiceId": 1,
  "attendance": [
    {
      "playerId": 1,
      "attended": true,
      "lateMinutes": 0,
      "notes": "Ready to go"
    },
    {
      "playerId": 2,
      "attended": true,
      "lateMinutes": 5,
      "notes": "Traffic delay"
    },
    {
      "playerId": 3,
      "attended": false,
      "lateMinutes": 0,
      "notes": "Sick"
    }
  ]
}
```

### Update Practice Session
```
PUT /api/practice-sessions/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "notes": "Great practice session, team showed improvement"
}
```

### Get Practice Session Details
```
GET /api/practice-sessions/:id
Authorization: Bearer <token>
```

## Player Notes Management

### Add Player Note
```
POST /api/practice-sessions/:id/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "playerId": 1,
  "notes": "Excellent passing today, showed great improvement",
  "noteType": "practice"
}
```

### Get Session Notes
```
GET /api/practice-sessions/:id/notes
Authorization: Bearer <token>
```

## Video Management

### Get All Videos
```
GET /api/videos
Authorization: Bearer <token>
```

### Create Video
```
POST /api/videos
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Serving Technique Basics",
  "category": "Serving",
  "duration": "8:45",
  "description": "Fundamentals of volleyball serving technique",
  "thumbnail": "https://example.com/thumb.jpg",
  "videoUrl": "https://example.com/video.mp4"
}
```

### Update Video
```
PUT /api/videos/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Advanced Serving Techniques",
  "category": "Serving",
  "duration": "12:30",
  "description": "Advanced serving strategies and techniques",
  "thumbnail": "https://example.com/new-thumb.jpg",
  "videoUrl": "https://example.com/new-video.mp4"
}
```

### Delete Video
```
DELETE /api/videos/:id
Authorization: Bearer <token>
```

## Analytics and Statistics

### Get Team Statistics
```
GET /api/team/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalPlayers": 12,
    "averageSkillLevel": 7.2,
    "totalPractices": 25,
    "averageAttendance": 0.89,
    "positionBreakdown": {
      "Outside Hitter": 4,
      "Middle Blocker": 3,
      "Setter": 2,
      "Libero": 2,
      "Opposite": 1
    }
  }
}
```

## Data Models

### Coach
```json
{
  "id": 1,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "username": "john_doe",
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Team
```json
{
  "id": 1,
  "name": "Varsity Volleyball",
  "season": "Fall 2024",
  "division": "High School",
  "description": "Competitive varsity team",
  "coachId": 1,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Player
```json
{
  "id": 1,
  "first_name": "Jane",
  "last_name": "Smith",
  "jersey_number": 15,
  "position": "Outside Hitter",
  "skill_level": 8,
  "grade": 11,
  "height": "5'8\"",
  "notes": "Strong attack, needs work on passing",
  "teamId": 1,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### Drill
```json
{
  "id": 1,
  "name": "Pepper Drill",
  "category": "Passing",
  "duration": 15,
  "description": "Basic passing and setting drill",
  "setup": "Players pair up across the net",
  "execution": "Pass, set, attack sequence",
  "equipment": ["volleyballs", "net"],
  "focus": ["passing", "setting", "timing"],
  "difficulty": 3,
  "min_players": 4,
  "max_players": 20,
  "coachId": 1,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### Practice
```json
{
  "id": 1,
  "name": "Pre-Game Practice",
  "date": "2024-01-15",
  "start_time": "15:30",
  "end_time": "17:30",
  "location": "Main Gym",
  "focus": "Game preparation and strategy",
  "teamId": 1,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

### Practice Session
```json
{
  "id": 1,
  "practiceId": 1,
  "status": "in_progress",
  "started_at": "2024-01-15T15:30:00.000Z",
  "ended_at": null,
  "notes": null,
  "created_at": "2024-01-15T15:30:00.000Z"
}
```

### Video
```json
{
  "id": 1,
  "title": "Serving Technique Basics",
  "category": "Serving",
  "duration": "8:45",
  "description": "Fundamentals of volleyball serving technique",
  "thumbnail": "https://example.com/thumb.jpg",
  "videoUrl": "https://example.com/video.mp4",
  "coachId": 1,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (no active team selected)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## Rate Limiting
- Authentication endpoints: 5 requests per minute per IP
- All other endpoints: Standard rate limiting applies

## Notes
- All timestamps are in ISO 8601 format
- Team selection is required for player, practice, and drill operations
- Jersey numbers must be unique within a team
- Coach can only access their own teams and data
- Practice sessions track real-time attendance and notes
- Videos are coach-specific and can be categorized by skill area